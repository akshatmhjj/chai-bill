"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatINRCompact } from "@/lib/money/paise";

/** A formatted rupee amount in tabular figures. Safe to use in server and client components. */
export function Money({ paise, className = "" }: { paise: number; className?: string }) {
  return <span className={`tabular ${className}`}>{formatINRCompact(paise)}</span>;
}

/**
 * An amount that counts up or down to its new value when it changes. While moving it shows whole
 * rupees, then snaps to the exact value, so paise never flicker.
 */
export function AnimatedMoney({ paise, className = "", duration = 0.85 }: { paise: number; className?: string; duration?: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(paise);
  const [moving, setMoving] = useState(false);
  const current = useRef(paise);

  useEffect(() => {
    if (reduce || current.current === paise) {
      current.current = paise;
      setDisplay(paise);
      return;
    }
    setMoving(true);
    const controls = animate(current.current, paise, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => {
        current.current = value;
        setDisplay(value);
      },
      onComplete: () => {
        current.current = paise;
        setDisplay(paise);
        setMoving(false);
      },
    });
    return () => controls.stop();
  }, [paise, reduce, duration]);

  const shown = moving ? Math.round(display / 100) * 100 : paise;
  return (
    <span className={`tabular ${className}`} aria-label={formatINRCompact(paise)}>
      {formatINRCompact(shown)}
    </span>
  );
}
