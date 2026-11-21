"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Sticky area under the scrolling content, for the primary action. */
  footer?: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    setDesktop(media.matches);
    const onChange = (event: MediaQueryListEvent) => setDesktop(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

/**
 * A bottom sheet on phones (drag the handle down to dismiss) and a centred dialog from tablet up.
 * It renders in a portal so page transforms cannot break its fixed positioning, locks page scroll,
 * traps focus, closes on Escape and returns focus to whatever opened it.
 */
export function Sheet({ open, onClose, title, description, children, footer }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const desktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dragControls = useDragControls();
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the panel itself first so screen readers announce the title, not a random field.
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0 bg-[var(--scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:items-center md:p-6">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="pointer-events-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-sheet bg-canvas shadow-sheet outline-none md:max-h-[88dvh] md:rounded-sheet"
              initial={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: "100%" }}
              animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
              exit={desktop ? { opacity: 0, scale: 0.97, transition: { duration: 0.14 } } : { y: "100%", transition: { duration: 0.22, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              drag={desktop ? false : "y"}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onDragEnd}
            >
              <div
                className="flex shrink-0 touch-none flex-col items-center pt-2.5 md:hidden"
                onPointerDown={(event) => dragControls.start(event)}
              >
                <span className="h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
              </div>
              <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-3 md:pt-5">
                <div className="min-w-0">
                  <h2 id={titleId} className="font-display text-2xl font-semibold leading-tight text-ink">
                    {title}
                  </h2>
                  {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1.5 rounded-full p-2 text-ink-3 transition-colors hover:bg-sunken hover:text-ink active:scale-95"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
              {footer && (
                <div className="shrink-0 border-t border-line bg-canvas px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 md:pb-4">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
