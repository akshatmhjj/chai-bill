"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Banknote, Smartphone, Trash2, Wallet } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteSettlementAction } from "@/app/(app)/n/[nestId]/balances/actions";
import { Avatar } from "@/components/avatar/Avatar";
import { useLive } from "@/components/live/LiveProvider";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { Member } from "@/lib/data/context";
import type { SettlementView } from "@/lib/data/queries";
import { dayLabel } from "@/lib/time";

const METHOD = {
  upi: { label: "UPI", icon: Smartphone },
  cash: { label: "Cash", icon: Banknote },
  other: { label: "Other", icon: Wallet },
} as const;

export function PaymentHistory({ settlements, me, members, seenAt, today }: { settlements: SettlementView[]; me: Member; members: Member[]; seenAt: string; today: string }) {
  const { isFresh } = useLive();
  const { toast } = useToast();
  const [target, setTarget] = useState<SettlementView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const person = (id: string) => members.find((m) => m.userId === id);

  function remove() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteSettlementAction(target.id);
      if (!result.ok) return setError(result.error);
      toast({ title: "Payment deleted", description: "Your balance has been updated." });
      setTarget(null);
      setError(null);
    });
  }

  return (
    <>
      <ul className="divide-y divide-line overflow-clip rounded-card border border-line bg-surface px-4 shadow-soft">
        <AnimatePresence initial={false}>
          {settlements.map((s) => {
            const from = person(s.fromUser);
            const to = person(s.toUser);
            const mine = s.createdBy === me.userId;
            const isNew = s.createdBy !== me.userId && s.createdAt > seenAt;
            const method = METHOD[s.method];
            const MethodIcon = method.icon;
            return (
              <motion.li
                key={s.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 38 }}
                className="overflow-clip"
              >
                <div className={`-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 ${isFresh(s.id) ? "animate-fresh" : ""}`}>
                  <span className="flex shrink-0 items-center -space-x-2">
                    <Avatar avatar={from?.avatar} size={36} ring="surface" />
                    <Avatar avatar={to?.avatar} size={36} ring="surface" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 font-semibold">
                      <span className="truncate">{s.fromUser === me.userId ? "You" : from?.name ?? "Someone"}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                      <span className="truncate">{s.toUser === me.userId ? "you" : to?.name ?? "someone"}</span>
                      {isNew && <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-accent">New</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 font-semibold text-ink-2">
                        <MethodIcon className="size-3" aria-hidden />
                        {method.label}
                      </span>
                      <span>{dayLabel(s.settledOn, today)}</span>
                      {s.reference && <span className="font-mono">{s.reference}</span>}
                      {s.note && <span className="truncate">“{s.note}”</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Money paise={s.amountPaise} className="font-semibold" />
                    {mine && (
                      <button
                        type="button"
                        onClick={() => setTarget(s)}
                        aria-label="Delete this payment"
                        className="rounded-full p-2 text-ink-3 transition-colors hover:bg-negative-soft hover:text-negative active:scale-90"
                      >
                        <Trash2 className="size-[18px]" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <Sheet
        open={Boolean(target)}
        onClose={() => {
          setTarget(null);
          setError(null);
        }}
        title="Delete this payment?"
        description="Your balance goes back to what it was before you recorded it."
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" full onClick={() => setTarget(null)}>
              Keep it
            </Button>
            <Button variant="danger" size="lg" full onClick={remove} loading={pending}>
              Delete
            </Button>
          </div>
        }
      >
        {target && (
          <div className="pb-2">
            <p className="text-ink-2">
              <Money paise={target.amountPaise} className="font-semibold text-ink" /> to {person(target.toUser)?.name ?? "your housemate"} on {dayLabel(target.settledOn, today)}
            </p>
            {error && <p role="alert" className="mt-2 text-sm text-negative">{error}</p>}
          </div>
        )}
      </Sheet>
    </>
  );
}
