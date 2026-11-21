"use client";

import { motion } from "motion/react";

/** A template remounts on every navigation, so each screen eases in instead of snapping. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
