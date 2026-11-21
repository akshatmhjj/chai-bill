"use client";

import { motion } from "motion/react";
import { Calendar, Equal, Lock, Percent, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteExpenseAction, saveExpenseAction } from "@/app/(app)/n/[nestId]/expenses/actions";
import { Avatar } from "@/components/avatar/Avatar";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useNestId, useNestPath } from "@/components/nest/NestContext";
import { CATEGORIES, CATEGORY_KEYS, guessCategory, type CategoryKey } from "@/lib/categories";
import type { Member } from "@/lib/data/context";
import type { ExpenseView } from "@/lib/data/queries";
import { parseExpenseForm } from "@/lib/expenses/form";
import { haptic } from "@/lib/haptics";
import { formatINRCompact, MoneyError, parseRupeesToPaise } from "@/lib/money/paise";
import { dayLabel } from "@/lib/time";
import { CATEGORY_ICONS } from "./CategoryIcon";

type Scope = "shared" | "personal";
type Method = "equal" | "amount" | "percent";

function inputRupees(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

function inputPercent(basisPoints: number): string {
  return basisPoints % 100 === 0 ? String(basisPoints / 100) : (basisPoints / 100).toFixed(2);
}

/** A person's own accent, used to colour their slice of the split bar. */
const SLICE_COLORS = ["var(--accent)", "var(--positive)", "#6f72d8", "#d9577f"];

export function ExpenseForm({
  me,
  members,
  today,
  expense,
}: {
  me: Member;
  members: Member[];
  today: string;
  /** Present when editing. */
  expense?: ExpenseView;
}) {
  const router = useRouter();
  const nestId = useNestId();
  const nestPath = useNestPath();
  const { toast } = useToast();
  const editing = Boolean(expense);

  const [scope, setScope] = useState<Scope>(expense?.scope ?? "shared");
  const [amount, setAmount] = useState(expense ? inputRupees(expense.amountPaise) : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState<CategoryKey | null>(expense?.category ?? null);
  const [suggested, setSuggested] = useState(false);
  const categoryTouched = useRef(Boolean(expense?.category));
  const [date, setDate] = useState(expense?.expenseDate ?? today);
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? me.userId);
  const [method, setMethod] = useState<Method>(expense?.splitMethod ?? "equal");
  const [included, setIncluded] = useState<Set<string>>(
    new Set(expense && expense.scope === "shared" ? expense.shares.map((s) => s.userId) : members.map((m) => m.userId)),
  );
  const [exact, setExact] = useState<Record<string, string>>(
    Object.fromEntries((expense?.shares ?? []).map((s) => [s.userId, inputRupees(s.paise)])),
  );
  const [percent, setPercent] = useState<Record<string, string>>(
    Object.fromEntries((expense?.shares ?? []).filter((s) => s.basisPoints !== null).map((s) => [s.userId, inputPercent(s.basisPoints as number)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) amountRef.current?.focus();
  }, [editing]);

  // Suggest a category from the description until the person picks one themselves.
  useEffect(() => {
    if (categoryTouched.current) return;
    const guess = guessCategory(description);
    setCategory(guess);
    setSuggested(Boolean(guess));
  }, [description]);

  function pickCategory(key: CategoryKey) {
    haptic();
    categoryTouched.current = true;
    setSuggested(false);
    setCategory((current) => (current === key ? null : key));
  }

  // The exact same parser the server uses, fed from this form's state.
  const participants = useMemo(() => members.filter((m) => included.has(m.userId)).map((m) => m.userId), [members, included]);
  const parsed = useMemo(() => {
    const form = new FormData();
    form.set("nestId", nestId);
    form.set("scope", scope);
    form.set("description", description);
    form.set("amount", amount);
    form.set("expenseDate", date);
    form.set("category", category ?? "");
    form.set("paidBy", paidBy);
    form.set("splitMethod", method);
    for (const id of participants) {
      form.append("participants", id);
      form.set(`exact_${id}`, exact[id] ?? "");
      form.set(`percent_${id}`, percent[id] ?? "");
    }
    return { form, result: parseExpenseForm(form, me.userId) };
  }, [nestId, scope, description, amount, date, category, paidBy, method, participants, exact, percent, me.userId]);

  let totalPaise = 0;
  let amountProblem: string | null = null;
  if (amount.trim()) {
    try {
      totalPaise = parseRupeesToPaise(amount);
    } catch (e) {
      amountProblem = e instanceof MoneyError ? "Use an amount like 250 or 249.50." : "Enter a valid amount.";
    }
  }

  // Friendly guidance for exact and percentage splits, instead of the parser's technical messages.
  let splitHint: string | null = null;
  if (scope === "shared" && totalPaise > 0) {
    if (method === "amount") {
      let sum = 0;
      for (const id of participants) {
        try {
          sum += exact[id] ? parseRupeesToPaise(exact[id]) : 0;
        } catch {
          // An unparsable entry is reported by the parser; ignore it for the running total.
        }
      }
      const diff = totalPaise - sum;
      splitHint = diff === 0 ? null : diff > 0 ? `${formatINRCompact(diff)} still to assign` : `${formatINRCompact(-diff)} over the total`;
    } else if (method === "percent") {
      let sum = 0;
      for (const id of participants) {
        const v = Number(percent[id] ?? "");
        if (Number.isFinite(v)) sum += Math.round(v * 100);
      }
      const diff = 10000 - sum;
      splitHint = diff === 0 ? null : diff > 0 ? `${inputPercent(diff)}% still to assign` : `${inputPercent(-diff)}% over 100`;
    } else if (participants.length === 0) {
      splitHint = "Choose who shares this";
    }
  }

  const ok = parsed.result.ok;
  const shares = parsed.result.ok ? parsed.result.expense.shares : [];
  const shareOf = (id: string) => shares.find((s) => s.userId === id)?.sharePaise;

  function toggleIncluded(id: string) {
    haptic();
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveExpenseAction(expense?.id ?? null, parsed.form);
      if (!result.ok) return setError(result.error);
      toast({ title: editing ? "Expense updated" : "Expense added", description: `${description.trim()} · ${formatINRCompact(totalPaise)}` });
      router.push(nestPath("/expenses"));
    });
  }

  function remove() {
    if (!expense) return;
    startTransition(async () => {
      const result = await deleteExpenseAction(expense.id);
      if (!result.ok) {
        setDeleteOpen(false);
        return setError(result.error);
      }
      toast({ title: "Expense deleted", description: expense.description });
      router.push(nestPath("/expenses"));
    });
  }

  const dateLabel = dayLabel(date, today);

  return (
    <div className="mx-auto w-full max-w-xl pb-28 lg:pb-10">
      <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0">
        <Link href={nestPath("/expenses")} aria-label="Close" className="-ml-2 flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken active:scale-95">
          <X className="size-6" aria-hidden />
        </Link>
        <h1 className="font-display text-xl font-semibold">{editing ? "Edit expense" : "Add expense"}</h1>
        <span className="size-10" aria-hidden />
      </div>

      <div className="flex flex-col gap-7 pt-4">
        {/* The amount: large, centred, impossible to miss. */}
        <div className="text-center">
          <label htmlFor="expense-amount" className="sr-only">
            Amount in rupees
          </label>
          <AmountInput id="expense-amount" ref={amountRef} value={amount} onChange={setAmount} invalid={Boolean(amountProblem)} />
          {amountProblem && <p role="alert" className="mt-1 text-sm text-negative">{amountProblem}</p>}
          <label htmlFor="expense-description" className="sr-only">
            What was it for?
          </label>
          <input
            id="expense-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            placeholder="What was it for?"
            className="mt-3 w-full border-b-2 border-line bg-transparent pb-2 text-center text-xl text-ink outline-none transition-colors placeholder:text-ink-3/70 focus:border-accent"
          />
        </div>

        {/* Category chips. */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-2">Category</p>
            {suggested && category && <p className="text-xs font-semibold text-accent">Suggested from what you typed</p>}
          </div>
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
            {CATEGORY_KEYS.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              const selected = category === key;
              const hex = CATEGORIES[key].hex;
              return (
                <motion.button
                  key={key}
                  type="button"
                  onClick={() => pickCategory(key)}
                  whileTap={{ scale: 0.93 }}
                  aria-pressed={selected}
                  className="flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors"
                  style={
                    selected
                      ? { background: `color-mix(in srgb, ${hex} 18%, var(--surface))`, borderColor: hex, color: hex }
                      : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink-2)" }
                  }
                >
                  <Icon className="size-4" aria-hidden />
                  {CATEGORIES[key].label}
                </motion.button>
              );
            })}
          </div>
        </div>

        <Segmented<Scope>
          label="Who is this for"
          value={scope}
          onChange={(next) => {
            haptic();
            setScope(next);
          }}
          options={[
            { value: "shared", label: "Shared", icon: <Users className="size-4" aria-hidden /> },
            { value: "personal", label: "Just me", icon: <Lock className="size-4" aria-hidden /> },
          ]}
        />

        {scope === "personal" ? (
          <p className="-mt-3 flex items-center gap-2 rounded-xl bg-sunken px-3.5 py-3 text-sm text-ink-2">
            <Lock className="size-4 shrink-0" aria-hidden />
            Only you can see this. It never affects what anyone in the nest owes.
          </p>
        ) : (
          <>
            {/* Who paid: tap an avatar. */}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-2">Paid by</p>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Paid by">
                {members.map((m) => {
                  const selected = paidBy === m.userId;
                  return (
                    <motion.button
                      key={m.userId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        haptic();
                        setPaidBy(m.userId);
                      }}
                      className={`flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-colors ${
                        selected ? "border-accent bg-accent-soft/60" : "border-line bg-surface hover:bg-surface-2"
                      }`}
                    >
                      <Avatar avatar={m.avatar} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.userId === me.userId ? "You" : m.name}</span>
                        <span className="block text-xs text-ink-3">{selected ? "paid" : "tap to switch"}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* The split. */}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-2">Split</p>
              <Segmented<Method>
                label="How to split"
                value={method}
                onChange={(next) => {
                  haptic();
                  setMethod(next);
                }}
                options={[
                  { value: "equal", label: "Equally", icon: <Equal className="size-4" aria-hidden /> },
                  { value: "amount", label: "Amounts", icon: <span aria-hidden className="text-sm font-bold">₹</span> },
                  { value: "percent", label: "Percent", icon: <Percent className="size-4" aria-hidden /> },
                ]}
              />

              <ul className="mt-3 flex flex-col gap-2">
                {members.map((m, index) => {
                  const on = included.has(m.userId);
                  const share = shareOf(m.userId);
                  return (
                    <li key={m.userId} className={`flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-opacity ${on ? "" : "opacity-55"}`}>
                      <button
                        type="button"
                        onClick={() => toggleIncluded(m.userId)}
                        aria-pressed={on}
                        aria-label={`${on ? "Remove" : "Include"} ${m.name}`}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="relative">
                          <Avatar avatar={m.avatar} size={40} />
                          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-surface" style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{m.userId === me.userId ? "You" : m.name}</span>
                          <span className="block text-xs text-ink-3">{on ? "sharing" : "left out"}</span>
                        </span>
                      </button>
                      {on && method === "amount" && (
                        <div className="flex items-center gap-1">
                          <span className="text-ink-3">₹</span>
                          <input
                            inputMode="decimal"
                            aria-label={`${m.name}'s amount`}
                            value={exact[m.userId] ?? ""}
                            onChange={(e) => setExact((c) => ({ ...c, [m.userId]: e.target.value }))}
                            placeholder="0"
                            className="tabular h-10 w-24 rounded-lg border border-line bg-canvas px-2 text-right text-base outline-none focus:border-accent"
                          />
                        </div>
                      )}
                      {on && method === "percent" && (
                        <div className="flex items-center gap-1">
                          <input
                            inputMode="decimal"
                            aria-label={`${m.name}'s percentage`}
                            value={percent[m.userId] ?? ""}
                            onChange={(e) => setPercent((c) => ({ ...c, [m.userId]: e.target.value }))}
                            placeholder="0"
                            className="tabular h-10 w-20 rounded-lg border border-line bg-canvas px-2 text-right text-base outline-none focus:border-accent"
                          />
                          <span className="text-ink-3">%</span>
                        </div>
                      )}
                      {on && method === "equal" && (
                        <span className="tabular text-right font-semibold">{share !== undefined ? formatINRCompact(share) : "–"}</span>
                      )}
                      {on && method === "percent" && share !== undefined && (
                        <span className="tabular w-20 text-right text-sm text-ink-3">{formatINRCompact(share)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* A proportional bar: whose share is how much of the total. */}
              {ok && totalPaise > 0 && shares.length > 0 && (
                <div className="mt-3" aria-hidden>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-sunken">
                    {shares.map((s) => {
                      const index = members.findIndex((m) => m.userId === s.userId);
                      return (
                        <motion.span
                          key={s.userId}
                          layout
                          animate={{ width: `${(s.sharePaise / totalPaise) * 100}%` }}
                          transition={{ type: "spring", stiffness: 300, damping: 34 }}
                          style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {splitHint && (
                <p role="status" className="mt-2 text-sm font-semibold text-accent-ink">
                  {splitHint}
                </p>
              )}
            </div>
          </>
        )}

        {/* Date. */}
        <label className="relative flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
          <Calendar className="size-5 text-ink-3" aria-hidden />
          <span className="flex-1 font-semibold">{dateLabel}</span>
          <span className="text-sm text-ink-3">Change</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Date of the expense"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        {error && <p role="alert" className="text-sm text-negative">{error}</p>}

        {editing && (
          <Button variant="danger" onClick={() => setDeleteOpen(true)} full>
            <Trash2 className="size-4" aria-hidden />
            Delete this expense
          </Button>
        )}
      </div>

      {/* The primary action stays in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto max-w-xl">
          <Button size="lg" full onClick={save} loading={pending} disabled={!ok || pending}>
            {editing ? "Save changes" : totalPaise > 0 && ok ? `Add ${formatINRCompact(totalPaise)} expense` : "Add expense"}
          </Button>
        </div>
      </div>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this expense?"
        description="It disappears from the list and your balance updates. The record stays in the activity feed."
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" full onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button variant="danger" size="lg" full onClick={remove} loading={pending}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="pb-2 text-ink-2">
          {expense?.description} · {expense ? formatINRCompact(expense.amountPaise) : ""}
        </p>
      </Sheet>
    </div>
  );
}
