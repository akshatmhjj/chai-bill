"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvatarStack } from "@/components/avatar/Avatar";
import { Button } from "@/components/ui/Button";
import type { Member } from "@/lib/data/context";

/** Shown once after joining a flat: who is here, and how it works in three lines. */
export function WelcomeCard({ householdName, members }: { householdName: string; members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function dismiss() {
    setOpen(false);
    // Drop ?welcome=1 so it doesn't come back on refresh.
    router.replace("/", { scroll: false });
  }

  const steps = [
    ["Add what you spend", "Choose who paid and how to split it: equally, by amounts, or by percentage."],
    ["Watch the balance", "It updates itself, so you always know who owes whom."],
    ["Settle up any time", "Record a UPI or cash payment, in full or in part."],
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="overflow-clip rounded-card border border-accent/30 bg-accent-soft/60 p-5"
          aria-label="Welcome"
        >
          <div className="flex items-center gap-3">
            <AvatarStack people={members.map((m) => ({ avatar: m.avatar, name: m.name }))} size={44} />
            <div>
              <h2 className="font-display text-2xl font-semibold leading-tight text-accent-ink">Welcome to {householdName}</h2>
              <p className="text-sm text-accent-ink/80">{members.map((m) => m.name).join(" & ")}</p>
            </div>
          </div>
          <ol className="mt-4 flex flex-col gap-2.5">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">{i + 1}</span>
                <p className="text-sm text-ink-2">
                  <strong className="font-semibold text-ink">{title}.</strong> {body}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Button onClick={dismiss}>Got it</Button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
