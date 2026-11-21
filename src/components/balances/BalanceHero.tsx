"use client";

import { motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { IllustrationSettled } from "@/components/brand/Illustrations";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { AnimatedMoney } from "@/components/ui/Money";
import type { Member } from "@/lib/data/context";
import { SettleSheet } from "./SettleSheet";

/** The dashed line between two avatars, marching toward whoever is owed. */
function Flow({ toward }: { toward: "right" | "left" }) {
  const Chevron = toward === "right" ? ChevronRight : ChevronLeft;
  return (
    <div className="relative flex h-8 flex-1 items-center" aria-hidden>
      <div
        className={`h-[3px] w-full rounded-full animate-flowbg ${toward === "left" ? "[animation-direction:reverse]" : ""}`}
        style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor 0 6px, transparent 6px 12px)", backgroundSize: "12px 3px" }}
      />
      <Chevron className={`absolute size-6 ${toward === "right" ? "right-0" : "left-0"}`} strokeWidth={3} />
    </div>
  );
}

/**
 * The most important block in the app: who owes whom, how much, and what to do about it.
 * It has three moods: you owe (clay), you are owed (green) and all square (a toast between two cups).
 */
export function BalanceHero({
  me,
  roommate,
  netPaise,
  today,
  hasHistory,
  autoOpenSettle = false,
  detailsHref,
}: {
  me: Member;
  roommate: Member;
  /** Your net balance. Negative: you owe. Positive: you are owed. */
  netPaise: number;
  today: string;
  /** Whether any expense or payment exists yet, to choose between "all settled" and "get started". */
  hasHistory: boolean;
  autoOpenSettle?: boolean;
  detailsHref?: string;
}) {
  const [settleOpen, setSettleOpen] = useState(autoOpenSettle);
  const [celebrate, setCelebrate] = useState(false);
  const stopCelebrating = useCallback(() => setCelebrate(false), []);

  const owe = netPaise < 0 ? -netPaise : 0;
  const owed = netPaise > 0 ? netPaise : 0;
  const mood = owe > 0 ? "owe" : owed > 0 ? "owed" : "settled";

  const surface = {
    owe: "from-negative-soft via-surface to-surface",
    owed: "from-positive-soft via-surface to-surface",
    settled: "from-accent-soft/60 via-surface to-surface",
  }[mood];

  return (
    <>
      <section
        aria-label="Your balance"
        className={`relative overflow-clip rounded-card border border-line bg-gradient-to-br ${surface} p-5 shadow-soft sm:p-7`}
      >
        {mood === "settled" ? (
          <div className="flex flex-col items-center py-2 text-center">
            <IllustrationSettled className="w-52 sm:w-60" />
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {hasHistory ? "You two are all settled" : "Nothing to settle yet"}
            </h2>
            <p className="mt-1 max-w-xs text-balance text-sm text-ink-3">
              {hasHistory ? `No one owes anyone anything. Enjoy it, ${me.name}.` : "Add your first shared expense and the balance shows up here."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Link href="/expenses/new" className={buttonStyles({ variant: "soft" })}>
                Add an expense
              </Link>
              {detailsHref && hasHistory && (
                <Link href={detailsHref} className={buttonStyles({ variant: "ghost" })}>
                  View history
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <p className={`text-sm font-semibold ${mood === "owe" ? "text-negative" : "text-positive"}`}>
                {mood === "owe" ? `You owe ${roommate.name}` : `${roommate.name} owes you`}
              </p>
              <motion.p
                key={mood}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`font-display text-6xl font-semibold leading-none tracking-tight sm:text-7xl ${mood === "owe" ? "text-negative" : "text-positive"}`}
              >
                <AnimatedMoney paise={owe || owed} />
              </motion.p>
            </div>

            <div className={`flex items-center gap-3 ${mood === "owe" ? "text-negative/70" : "text-positive/70"}`}>
              <Avatar avatar={me.avatar} size={52} ring="surface" className="shadow-soft" />
              <Flow toward={mood === "owe" ? "right" : "left"} />
              <Avatar avatar={roommate.avatar} size={52} ring="surface" className="shadow-soft" />
            </div>

            {mood === "owe" ? (
              <div className="flex flex-wrap gap-2.5">
                <Button size="lg" onClick={() => setSettleOpen(true)} className="flex-1 sm:flex-none">
                  Settle up
                  <ArrowRight className="size-5" aria-hidden />
                </Button>
                {detailsHref && (
                  <Link href={detailsHref} className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    See why
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-ink-2">{roommate.name} can record a payment as soon as they pay you back.</p>
                {detailsHref && (
                  <Link href={detailsHref} className={buttonStyles({ variant: "secondary" })}>
                    See details
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <SettleSheet
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        me={me}
        roommate={roommate}
        owePaise={owe}
        today={today}
        onRecorded={({ settled }) => settled && setCelebrate(true)}
      />
      {celebrate && <Confetti onDone={stopCelebrating} />}
    </>
  );
}
