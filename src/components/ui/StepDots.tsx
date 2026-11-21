"use client";

import { motion } from "motion/react";

/** "Step 2 of 3" as three dots; the current one stretches into a pill. */
export function StepDots({ step, total = 3, labels }: { step: number; total?: number; labels?: string[] }) {
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`Step ${step} of ${total}${labels?.[step - 1] ? `: ${labels[step - 1]}` : ""}`}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const index = i + 1;
          return (
            <motion.span
              key={index}
              layout
              animate={{ width: index === step ? 24 : 8, opacity: index <= step ? 1 : 0.35 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className={`h-2 rounded-full ${index <= step ? "bg-accent" : "bg-line-strong"}`}
            />
          );
        })}
      </div>
      {labels?.[step - 1] && <span className="text-sm font-semibold text-ink-3">{labels[step - 1]}</span>}
    </div>
  );
}
