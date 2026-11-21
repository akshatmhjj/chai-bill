"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

/** App-wide client providers: theme, motion preferences and toasts. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* "user" turns movement into plain fades for people who ask their OS for reduced motion. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
