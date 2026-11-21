"use client";

import { AnimatePresence, motion } from "motion/react";

/**
 * A list whose rows ease in and out as they are added or removed (for example when your roommate
 * adds something and the screen refreshes). Pass pre-rendered rows with stable ids.
 */
export function AnimatedList({
  items,
  className = "",
  itemClassName = "",
}: {
  items: { id: string | number; node: React.ReactNode }[];
  className?: string;
  itemClassName?: string;
}) {
  return (
    <ul className={className}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className={`overflow-clip ${itemClassName}`}
          >
            {item.node}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
