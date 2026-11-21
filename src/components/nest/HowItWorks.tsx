"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";

const STEP_MS = 4200;

const STEPS = [
  { title: "Make a nest", line: "One nest per home. Name it anything you like." },
  { title: "Invite with a code", line: "Share a short code or a QR. Whoever scans it is in." },
  { title: "Add what you spend", line: "Type the amount, pick who paid, and split it. Done in seconds." },
  { title: "Settle up", line: "See who owes whom, pay by UPI, and watch the balance hit zero." },
];

/** A four-scene walkthrough that plays on loop. Pauses on hover, and can be picked by hand. */
export function HowItWorks() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || reduce) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(id);
  }, [paused, reduce]);

  return (
    <section
      aria-label="How Chai Bill works"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="overflow-clip rounded-card border border-line bg-surface shadow-soft"
    >
      <div className="relative h-56 bg-accent-soft/60 sm:h-64">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Scene step={step} reduce={Boolean(reduce)} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-1.5 p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <p className="font-display text-2xl font-semibold">
              <span className="mr-2 text-accent">{step + 1}.</span>
              {STEPS[step].title}
            </p>
            <p className="text-ink-2">{STEPS[step].line}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center gap-2 pt-3" role="tablist" aria-label="Pick a step">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={`Step ${i + 1}: ${s.title}`}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-accent" : "w-2 bg-line-strong hover:bg-ink-3"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Scene({ step, reduce }: { step: number; reduce: boolean }) {
  const bob = reduce ? {} : { y: [0, -6, 0] };
  const loop = reduce ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const };

  if (step === 0) {
    return (
      <motion.div animate={bob} transition={loop} className="flex flex-col items-center gap-3">
        <div className="flex size-24 items-center justify-center rounded-[28px] bg-accent text-4xl text-on-accent shadow-lift">
          <span aria-hidden>&#127968;</span>
        </div>
        <div className="rounded-full bg-surface px-4 py-1.5 text-sm font-semibold text-ink-2 shadow-soft">Our nest</div>
      </motion.div>
    );
  }

  if (step === 1) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          {["k", "7", "q", "2", "m", "9", "t", "x"].map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.12, duration: 0.25 }}
              className="flex size-9 items-center justify-center rounded-lg bg-surface font-mono text-lg font-bold text-ink shadow-soft"
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: reduce ? 0 : 1, type: "spring", stiffness: 320, damping: 20 }}
          className="grid size-16 grid-cols-4 gap-0.5 rounded-xl bg-surface p-2 shadow-soft"
          aria-hidden
        >
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className={`rounded-[2px] ${[0, 1, 3, 4, 7, 8, 10, 12, 14, 15].includes(i) ? "bg-ink" : "bg-transparent"}`} />
          ))}
        </motion.div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex w-64 flex-col items-center gap-3">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-4xl font-semibold tabular-nums">
          &#8377;1,200
        </motion.p>
        <div className="flex w-full items-center gap-2">
          <Avatar avatar="fox" size={34} />
          <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-sunken">
            <motion.span initial={{ width: 0 }} animate={{ width: "50%" }} transition={{ delay: reduce ? 0 : 0.4, duration: 0.6 }} className="bg-accent" />
            <motion.span initial={{ width: 0 }} animate={{ width: "50%" }} transition={{ delay: reduce ? 0 : 0.6, duration: 0.6 }} className="bg-positive" />
          </div>
          <Avatar avatar="panda" size={34} />
        </div>
        <p className="text-sm font-semibold text-ink-2">Split equally, paid by you</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <motion.div animate={reduce ? {} : { rotate: [0, -6, 0, 6, 0] }} transition={loop}>
        <Avatar avatar="chai" size={64} ring="surface" className="shadow-lift" />
      </motion.div>
      <div className="flex flex-col items-center gap-1">
        <motion.span
          animate={reduce ? {} : { x: [0, 8, 0] }}
          transition={loop}
          className="text-2xl text-positive"
          aria-hidden
        >
          &rarr;
        </motion.span>
        <span className="rounded-full bg-positive-soft px-3 py-1 text-sm font-bold text-positive">All square</span>
      </div>
      <motion.div animate={reduce ? {} : { rotate: [0, 6, 0, -6, 0] }} transition={loop}>
        <Avatar avatar="panda" size={64} ring="surface" className="shadow-lift" />
      </motion.div>
    </div>
  );
}
