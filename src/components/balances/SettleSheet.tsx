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
 * Record a payment you made to your roommate. Any amount works (partial payments are normal),
 * and the sheet nudges but never blocks when you pay more than you owe.
 */
export function SettleSheet({
  open,
  onClose,
  me,
  roommate,
  owePaise,
  today,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  me: Member;
  roommate: Member;
  /** What you currently owe them, to prefill and to detect settling in full. 0 when nothing is owed. */
  owePaise: number;
  today: string;
  onRecorded?: (result: { settled: boolean; amountPaise: number }) => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("upi");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Start from what you owe each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setAmount(owePaise > 0 ? toInputRupees(owePaise) : "");
    setMethod("upi");
    setReference("");
    setNote("");
    setDate(today);
    setError(null);
  }, [open, owePaise, today]);

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
  const valid = amountPaise > 0 && !amountError;
  const overpaying = valid && owePaise > 0 && amountPaise > owePaise;

  function save() {
    setError(null);
    const form = new FormData();
    form.set("to", roommate.userId);
    form.set("amount", amount);
    form.set("method", method);
    form.set("reference", reference);
    form.set("note", note);
    form.set("settledOn", date);
    startTransition(async () => {
      const result = await recordSettlementAction(form);
      if (!result.ok) return setError(result.error);
      const settled = owePaise > 0 && amountPaise >= owePaise;
      toast({ title: settled ? "All settled up" : "Payment recorded", description: `${formatINRCompact(amountPaise)} to ${roommate.name}` });
      onClose();
      onRecorded?.({ settled, amountPaise });
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record a payment"
      description={`What you paid ${roommate.name}`}
      footer={
        <Button full size="lg" onClick={save} loading={pending} disabled={!valid}>
          {valid ? `Record ${formatINRCompact(amountPaise)} to ${roommate.name}` : "Enter an amount"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center gap-3">
          <Avatar avatar={me.avatar} size={44} ring="surface" />
          <span aria-hidden className="text-ink-3">→</span>
          <Avatar avatar={roommate.avatar} size={44} ring="surface" />
        </div>

        <div>
          <label htmlFor="settle-amount" className="sr-only">
            Amount in rupees
          </label>
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
          {overpaying && (
            <p className="mt-3 rounded-xl bg-hilite px-3 py-2 text-center text-sm text-ink-2">
              That&apos;s more than you owe. {roommate.name} would owe you the difference.
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
