"use client";

import { AnimatePresence, motion } from "motion/react";
import { Lock, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteExpenseAction } from "@/app/(app)/expenses/actions";
import { Avatar } from "@/components/avatar/Avatar";
import { IllustrationReceipt } from "@/components/brand/Illustrations";
import { Button, buttonStyles } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { CATEGORIES } from "@/lib/categories";
import type { Member } from "@/lib/data/context";
import type { ExpenseView } from "@/lib/data/queries";
import { dayLabel } from "@/lib/time";
import { CategoryTile } from "./CategoryIcon";
import { ExpenseRow } from "./ExpenseRow";

type Filter = "all" | "shared" | "personal";

const METHOD_LABEL = { equal: "Split equally", amount: "Exact amounts", percent: "By percentage" } as const;

export function ExpenseList({
  expenses,
  me,
  members,
  seenAt,
  today,
  month,
  openId,
}: {
  expenses: ExpenseView[];
  me: Member;
  members: Member[];
  seenAt: string;
  today: string;
  month: { totalPaise: number; yourSharePaise: number };
  openId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(openId ?? null);

  const visible = useMemo(() => expenses.filter((e) => filter === "all" || e.scope === filter), [expenses, filter]);
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseView[]>();
    for (const e of visible) map.set(e.expenseDate, [...(map.get(e.expenseDate) ?? []), e]);
    return [...map.entries()];
  }, [visible]);

  const selected = expenses.find((e) => e.id === selectedId) ?? null;
  const counts = { all: expenses.length, shared: expenses.filter((e) => e.scope === "shared").length, personal: expenses.filter((e) => e.scope === "personal").length };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Together this month</p>
          <Money paise={month.totalPaise} className="mt-1 block font-display text-3xl font-semibold" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Your share</p>
          <Money paise={month.yourSharePaise} className="mt-1 block font-display text-3xl font-semibold text-me-ink" />
        </div>
      </div>

      <Segmented<Filter>
        label="Show"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: `All ${counts.all}` },
          { value: "shared", label: `Shared ${counts.shared}`, icon: <Users className="size-3.5" aria-hidden /> },
          { value: "personal", label: `Mine ${counts.personal}`, icon: <Lock className="size-3.5" aria-hidden /> },
        ]}
      />

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            illustration={<IllustrationReceipt className="w-48" />}
            title={filter === "personal" ? "No personal expenses" : filter === "shared" ? "No shared expenses yet" : "No expenses yet"}
            description={
              filter === "personal"
                ? "Things you track just for yourself show up here, and nobody else in the flat sees them."
                : "Add the first one and it shows up here, with who paid and how it was split."
            }
            action={
              <Link href="/expenses/new" className={buttonStyles()}>
                Add an expense
              </Link>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <AnimatePresence initial={false}>
            {groups.map(([day, items]) => (
              <motion.section key={day} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3 className="mb-1 text-sm font-semibold text-ink-3">{dayLabel(day, today)}</h3>
                <ul className="divide-y divide-line rounded-card border border-line bg-surface px-4 shadow-soft">
                  <AnimatePresence initial={false}>
                    {items.map((expense) => (
                      <motion.li
                        key={expense.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        className="overflow-clip"
                      >
                        <ExpenseRow
                          expense={expense}
                          me={me.userId}
                          members={members}
                          isNew={expense.scope === "shared" && expense.createdBy !== me.userId && expense.createdAt > seenAt}
                          onClick={() => setSelectedId(expense.id)}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ExpenseDetails expense={selected} me={me} members={members} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function ExpenseDetails({ expense, me, members, onClose }: { expense: ExpenseView | null; me: Member; members: Member[]; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = expense ? expense.scope === "shared" || expense.createdBy === me.userId : false;
  const payer = expense ? members.find((m) => m.userId === expense.paidBy) : null;

  function close() {
    setConfirming(false);
    setError(null);
    onClose();
  }

  function remove() {
    if (!expense) return;
    startTransition(async () => {
      const result = await deleteExpenseAction(expense.id);
      if (!result.ok) return setError(result.error);
      toast({ title: "Expense deleted", description: expense.description });
      close();
      router.refresh();
    });
  }

  return (
    <Sheet
      open={Boolean(expense)}
      onClose={close}
      title={expense?.description ?? "Expense"}
      description={expense ? `${CATEGORIES[expense.category ?? "other"].label} · ${expense.expenseDate}` : undefined}
      footer={
        expense && editable ? (
          confirming ? (
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" full onClick={() => setConfirming(false)}>
                Keep it
              </Button>
              <Button variant="danger" size="lg" full onClick={remove} loading={pending}>
                Yes, delete
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="danger" size="lg" onClick={() => setConfirming(true)} aria-label="Delete expense">
                <Trash2 className="size-5" aria-hidden />
              </Button>
              <Link href={`/expenses/${expense.id}/edit`} className={buttonStyles({ size: "lg", full: true })}>
                <Pencil className="size-4" aria-hidden />
                Edit
              </Link>
            </div>
          )
        ) : undefined
      }
    >
      {expense && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <CategoryTile category={expense.category} size={56} />
            <div>
              <Money paise={expense.amountPaise} className="block font-display text-4xl font-semibold" />
              {expense.scope === "personal" ? (
                <p className="flex items-center gap-1.5 text-sm text-ink-3">
                  <Lock className="size-3.5" aria-hidden /> Only you can see this
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-ink-3">
                  <Avatar avatar={payer?.avatar} size={18} /> {expense.paidBy === me.userId ? "You paid" : `${payer?.name ?? "Someone"} paid`}
                </p>
              )}
            </div>
          </div>

          {expense.scope === "shared" && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-2">{METHOD_LABEL[expense.splitMethod]}</p>
              <ul className="flex flex-col gap-2.5">
                {expense.shares.map((share) => {
                  const person = members.find((m) => m.userId === share.userId);
                  const portion = expense.amountPaise > 0 ? (share.paise / expense.amountPaise) * 100 : 0;
                  return (
                    <li key={share.userId} className="rounded-2xl border border-line bg-surface p-3">
                      <div className="flex items-center gap-3">
                        <Avatar avatar={person?.avatar} size={36} />
                        <span className="flex-1 font-semibold">{share.userId === me.userId ? "You" : person?.name ?? "Someone"}</span>
                        <Money paise={share.paise} className="font-semibold" />
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-clip rounded-full bg-sunken" aria-hidden>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${portion}%` }} transition={{ type: "spring", stiffness: 160, damping: 24 }} className="h-full rounded-full bg-accent" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}
