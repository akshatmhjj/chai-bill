"use client";

import { Banknote, Smartphone, Wallet } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { recordSettlementAction } from "@/app/(app)/balances/actions";
import { Avatar } from "@/components/avatar/Avatar";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { Member } from "@/lib/data/context";
import { formatINRCompact, MoneyError, parseRupeesToPaise } from "@/lib/money/paise";

type Method = "upi" | "cash" | "other";

/** Whole rupees without grouping, for putting into an input: 30000 paise -> "300", 30050 -> "300.50". */
function toInputRupees(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/**
 * Record a payment you made to one person. Any amount works (partial payments are normal).
 * The sheet starts on the person you owe most, with the plan's amount for them, and warns but never
 * blocks when you pay more than the plan asks.
 */
export function SettleSheet({
  open,
  onClose,
  me,
  others,
  planned,
  today,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  me: Member;
  /** Everyone you could pay. */
  others: Member[];
  /** The settle-up plan's amount you owe each person (paise). People not listed are owed nothing. */
  planned: Record<string, number>;
  today: string;
  onRecorded?: (result: { settled: boolean; amountPaise: number; toName: string }) => void;
}) {
  const { toast } = useToast();
  const payees = [...others].sort((a, b) => (planned[b.userId] ?? 0) - (planned[a.userId] ?? 0));
  const defaultPayee = payees[0]?.userId ?? "";

  const [to, setTo] = useState(defaultPayee);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("upi");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const payee = others.find((m) => m.userId === to) ?? null;
  const owePaise = planned[to] ?? 0;

  // Start fresh each time the sheet opens, on the person you owe most.
  useEffect(() => {
    if (!open) return;
    setTo(defaultPayee);
    setAmount(owePaise > 0 ? toInputRupees(owePaise) : "");
    setMethod("upi");
    setReference("");
    setNote("");
    setDate(today);
    setError(null);
    // owePaise is read for the chosen payee on open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Changing the payee suggests that person's planned amount.
  function choose(next: string) {
    setTo(next);
    const plan = planned[next] ?? 0;
    setAmount(plan > 0 ? toInputRupees(plan) : "");
    setError(null);
  }

  let amountPaise = 0;
  let amountError: string | null = null;
  if (amount.trim()) {
    try {
      amountPaise = parseRupeesToPaise(amount);
      if (amountPaise <= 0) amountError = "Enter an amount above zero.";
    } catch (e) {
      amountError = e instanceof MoneyError ? "Enter an amount like 250 or 249.50." : "Enter a valid amount.";
    }
  }
  const valid = Boolean(payee) && amountPaise > 0 && !amountError;
  const overpaying = valid && owePaise > 0 && amountPaise > owePaise;

  function save() {
    if (!payee) return;
    setError(null);
    const form = new FormData();
    form.set("to", payee.userId);
    form.set("amount", amount);
    form.set("method", method);
    form.set("reference", reference);
    form.set("note", note);
    form.set("settledOn", date);
    startTransition(async () => {
      const result = await recordSettlementAction(form);
      if (!result.ok) return setError(result.error);
      const settled = owePaise > 0 && amountPaise >= owePaise;
      toast({ title: settled ? "All settled up with " + payee.name : "Payment recorded", description: `${formatINRCompact(amountPaise)} to ${payee.name}` });
      onClose();
      onRecorded?.({ settled, amountPaise, toName: payee.name });
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record a payment"
      description={payee ? `What you paid ${payee.name}` : "Who did you pay?"}
      footer={
        <Button full size="lg" onClick={save} loading={pending} disabled={!valid}>
          {valid && payee ? `Record ${formatINRCompact(amountPaise)} to ${payee.name}` : "Enter an amount"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {others.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-2">Paying</p>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" role="radiogroup" aria-label="Who you paid">
              {others.map((m) => {
                const selected = m.userId === to;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(m.userId)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-semibold transition-colors ${
                      selected ? "border-accent bg-accent-soft/60" : "border-line bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <Avatar avatar={m.avatar} size={28} />
                    {m.name}
                    {(planned[m.userId] ?? 0) > 0 && <span className="text-xs text-ink-3">{formatINRCompact(planned[m.userId])}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Avatar avatar={me.avatar} size={44} ring="surface" />
          <span aria-hidden className="text-ink-3">→</span>
          {payee && <Avatar avatar={payee.avatar} size={44} ring="surface" />}
        </div>

        <div>
          <AmountInput id="settle-amount" value={amount} onChange={setAmount} invalid={Boolean(amountError)} size="lg" />
          {amountError && <p role="alert" className="mt-1 text-center text-sm text-negative">{amountError}</p>}
          {owePaise > 0 && (
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" onClick={() => setAmount(toInputRupees(owePaise))} className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-ink transition-transform active:scale-95">
                Full {formatINRCompact(owePaise)}
              </button>
              {owePaise >= 200 && (
                <button type="button" onClick={() => setAmount(toInputRupees(Math.round(owePaise / 2)))} className="rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold text-ink-2 transition-transform active:scale-95">
                  Half
                </button>
              )}
            </div>
          )}
          {overpaying && payee && (
            <p className="mt-3 rounded-xl bg-hilite px-3 py-2 text-center text-sm text-ink-2">
              That&apos;s more than you owe {payee.name}. They&apos;d owe you the difference.
            </p>
          )}
        </div>

        <Segmented<Method>
          label="How you paid"
          value={method}
          onChange={setMethod}
          options={[
            { value: "upi", label: "UPI", icon: <Smartphone className="size-4" aria-hidden /> },
            { value: "cash", label: "Cash", icon: <Banknote className="size-4" aria-hidden /> },
            { value: "other", label: "Other", icon: <Wallet className="size-4" aria-hidden /> },
          ]}
        />

        {method === "upi" && (
          <Field label="UPI reference" placeholder="Transaction ID (optional)" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
        )}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3">
            <Field label="Note" placeholder="Optional" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      </div>
    </Sheet>
  );
}
