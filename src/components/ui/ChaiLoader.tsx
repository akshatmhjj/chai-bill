"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const TIPS = [
  "Tap a category chip to tag it. Chai & food, Groceries, Rent...",
  "Split by amounts or percentages. The odd paisa goes with the payer.",
  "Tap a shopping item's circle to mark it bought. Tap Undo if you slip.",
  "Scan the nest's QR to join. It refreshes whenever you ask.",
  "Settle up in part. Any amount counts.",
  "Personal expenses are only ever visible to you.",
  "New things from housemates glow for a few seconds.",
];

/**
 * The wait between screens: a chai cup filling up, with a rotating tip. It replaces the grey
 * shimmer blocks so waiting feels like part of the app.
 */
export function ChaiLoader({ label = "Brewing…" }: { label?: string }) {
  const reduce = useReducedMotion();
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative h-28 w-24" aria-hidden>
        {/* steam */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute bottom-[70px] h-6 w-1.5 rounded-full bg-accent/40"
            style={{ left: 22 + i * 14 }}
            animate={reduce ? {} : { y: [0, -18, -28], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.8, delay: i * 0.4, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
        {/* cup */}
        <div className="absolute bottom-0 left-2 h-[68px] w-[68px] overflow-hidden rounded-b-[34px] rounded-t-md border-[3px] border-accent bg-surface">
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-accent"
            initial={{ height: "10%" }}
            animate={reduce ? { height: "70%" } : { height: ["10%", "75%", "10%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="absolute bottom-6 left-[70px] h-8 w-6 rounded-r-2xl border-[3px] border-accent" />
      </div>

      <div>
        <p className="font-display text-2xl font-semibold">{label}</p>
        <div className="mx-auto mt-3 flex h-12 max-w-xs items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={tip}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-ink-2"
            >
              <span className="font-semibold text-accent-ink">Tip · </span>
              {TIPS[tip]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
