"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonVariant } from "./Button";

/** Copies text, then shows a tick for a moment. */
export function CopyButton({ text, label = "Copy", variant = "secondary" }: { text: string; label?: string; variant?: ButtonVariant }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the text is still on screen to select by hand.
    }
  }

  return (
    <Button variant={variant} onClick={copy} className="min-w-28">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "done" : "idle"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.14 }}
          className="inline-flex items-center gap-2"
        >
          {copied ? <Check className="size-4 text-positive" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : label}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
