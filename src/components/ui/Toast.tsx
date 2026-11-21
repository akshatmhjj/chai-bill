"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Tone = "success" | "info" | "error" | "activity";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  /** Shown instead of the status icon, e.g. the roommate's avatar. */
  leading?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  /** Milliseconds. Toasts with an action stay a little longer. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const duration = input.duration ?? (input.action ? 6500 : 4200);
      // At most three at once: drop the oldest.
      setItems((current) => [...current.slice(-2), { ...input, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[70] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end lg:px-0"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const tone = item.tone ?? "info";
  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-lift"
    >
      <div className="shrink-0">
        {item.leading ??
          (tone === "error" ? (
            <CircleAlert className="size-5 text-negative" aria-hidden />
          ) : (
            <CircleCheck className="size-5 text-positive" aria-hidden />
          ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-ink">{item.title}</p>
        {item.description && <p className="text-xs leading-snug text-ink-3">{item.description}</p>}
      </div>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft active:scale-95"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-1 text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
}
