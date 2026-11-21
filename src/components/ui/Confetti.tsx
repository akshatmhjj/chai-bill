"use client";

import { motion } from "motion/react";
import { useEffect, useMemo } from "react";

const COLORS = ["var(--accent)", "var(--positive)", "#ffc94d", "var(--me)", "#8fbfe4"];

/**
 * A short, restrained burst for the moment a balance reaches zero. It removes itself when done,
 * and is skipped entirely for people who prefer reduced motion (the user setting turns it into nothing).
 */
export function Confetti({ onDone, count = 26 }: { onDone: () => void; count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.2;
        const distance = 110 + ((i * 53) % 120);
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: ((i * 97) % 360) - 180,
          color: COLORS[i % COLORS.length],
          size: 6 + (i % 4) * 2,
          round: i % 3 === 0,
        };
      }),
    [count],
  );

  useEffect(() => {
    const timer = setTimeout(onDone, 1700);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{ x: p.x, y: p.y + 120, opacity: 0, scale: 1, rotate: p.rotate }}
          transition={{ duration: 1.3, ease: [0.16, 0.8, 0.3, 1] }}
          style={{ width: p.size, height: p.round ? p.size : p.size * 1.6, background: p.color, borderRadius: p.round ? 999 : 2 }}
          className="absolute"
        />
      ))}
    </div>
  );
}
