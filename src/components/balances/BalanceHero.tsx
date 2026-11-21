"use client";

import { motion } from "motion/react";
import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarStack } from "@/components/avatar/Avatar";
import { IllustrationSettled } from "@/components/brand/Illustrations";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { AnimatedMoney, Money } from "@/components/ui/Money";
import type { Member } from "@/lib/data/context";
import type { Transfer } from "@/lib/money/balances";
import { SettleSheet } from "./SettleSheet";
import { useNestPath } from "@/components/nest/NestContext";

const SHOWN = 3;

/**
 * The most important block in the app: how much you owe or are owed in total, and exactly who with.
 * Three moods: you owe (clay), you are owed (green), and all square (a toast between two cups).
 */
export function BalanceHero({
  me,
  others,
  pay,
  receive,
  netPaise,
  today,
  hasHistory,
  autoOpenSettle = false,
  detailsHref,
  showSettle = true,
}: {
  me: Member;
  others: Member[];
  /** The settle-up plan's payments you make. */
  pay: Transfer[];
  /** The settle-up plan's payments made to you. */
  receive: Transfer[];
  /** Your net balance. Negative: you owe. Positive: you are owed. */
  netPaise: number;
  today: string;
  /** Whether any expense or payment exists yet, to choose between "all settled" and "get started". */
  hasHistory: boolean;
  autoOpenSettle?: boolean;
  detailsHref?: string;
  showSettle?: boolean;
}) {
  const nestPath = useNestPath();
  const [settleOpen, setSettleOpen] = useState(autoOpenSettle);
  const [celebrate, setCelebrate] = useState(false);

  const owe = netPaise < 0 ? -netPaise : 0;
  const owed = netPaise > 0 ? netPaise : 0;
  const mood = owe > 0 ? "owe" : owed > 0 ? "owed" : "settled";
  const nameOf = (id: string) => others.find((m) => m.userId === id)?.name ?? "someone";
  const avatarOf = (id: string) => others.find((m) => m.userId === id)?.avatar;
  const planned = Object.fromEntries(pay.map((t) => [t.to, t.paise]));

  const involved = mood === "owe" ? pay.map((t) => t.to) : receive.map((t) => t.from);
  const shownLines = (mood === "owe" ? pay.map((t) => ({ id: t.to, paise: t.paise, you: true })) : receive.map((t) => ({ id: t.from, paise: t.paise, you: false }))).slice(0, SHOWN);
  const more = involved.length - shownLines.length;

  const surface = {
    owe: "from-negative-soft via-surface to-surface",
    owed: "from-positive-soft via-surface to-surface",
    settled: "from-accent-soft/60 via-surface to-surface",
  }[mood];

  return (
    <>
      <section aria-label="Your balance" className={`relative overflow-clip rounded-card border border-line bg-gradient-to-br ${surface} p-5 shadow-soft sm:p-7`}>
        {mood === "settled" ? (
          <div className="flex flex-col items-center py-2 text-center">
            <IllustrationSettled className="w-52 sm:w-60" />
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {hasHistory ? (others.length === 1 ? "You two are all settled" : "Everyone is all settled up") : "Nothing to settle yet"}
            </h2>
            <p className="mt-1 max-w-xs text-balance text-sm text-ink-3">
              {hasHistory ? `Nobody owes anybody anything. Enjoy it, ${me.name}.` : "Add your first shared expense and the balance shows up here."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Link href={nestPath("/expenses/new")} className={buttonStyles({ variant: "soft" })}>
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
                {mood === "owe"
                  ? involved.length === 1
                    ? `You owe ${nameOf(involved[0])}`
                    : `You owe ${involved.length} people`
                  : involved.length === 1
                    ? `${nameOf(involved[0])} owes you`
                    : `${involved.length} people owe you`}
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

            <div className="flex items-center gap-3">
              <Avatar avatar={me.avatar} size={52} ring="surface" className="shadow-soft" />
              <div className={`h-[3px] flex-1 rounded-full ${mood === "owe" ? "text-negative/60" : "text-positive/60"}`} aria-hidden>
                <div
                  className="h-full w-full animate-flowbg rounded-full [animation-direction:normal]"
                  style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor 0 6px, transparent 6px 12px)", backgroundSize: "12px 3px", color: "inherit" }}
                />
              </div>
              <AvatarStack people={involved.slice(0, 3).map((id) => ({ avatar: avatarOf(id), name: nameOf(id) }))} size={44} />
              {more > 0 && <span className="text-sm font-semibold text-ink-3">+{more}</span>}
            </div>

            <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface/70">
              {shownLines.map((line) => (
                <li key={line.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <Avatar avatar={avatarOf(line.id)} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">
                    {line.you ? (
                      <>
                        You pay <strong className="font-semibold">{nameOf(line.id)}</strong>
                      </>
                    ) : (
                      <>
                        <strong className="font-semibold">{nameOf(line.id)}</strong> pays you
                      </>
                    )}
                  </span>
                  <Money paise={line.paise} className="font-semibold" />
                </li>
              ))}
            </ul>
            {more > 0 && detailsHref && (
              <Link href={detailsHref} className="-mt-3 inline-flex items-center gap-0.5 self-start rounded-lg px-1 py-0.5 text-sm font-semibold text-accent">
                and {more} more <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}

            <div className="flex flex-wrap gap-2.5">
              {mood === "owe" && showSettle && (
                <Button size="lg" onClick={() => setSettleOpen(true)} className="flex-1 sm:flex-none">
                  Settle up
                  <ArrowRight className="size-5" aria-hidden />
                </Button>
              )}
              {detailsHref && (
                <Link href={detailsHref} className={buttonStyles({ variant: mood === "owe" ? "secondary" : "soft", size: "lg" })}>
                  See why
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {showSettle && (
        <SettleSheet
          open={settleOpen}
          onClose={() => setSettleOpen(false)}
          me={me}
          others={others}
          planned={planned}
          today={today}
          onRecorded={({ settled }) => settled && setCelebrate(true)}
        />
      )}
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
    </>
  );
}
