"use client";

import { motion } from "motion/react";
import { useId } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  /** Shown as the segment's text. Pass an `sr-only` span for an icon-only segment. */
  label: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * A pill switcher with a sliding highlight. Works as a radio group (keyboard arrows move the choice)
 * and renders a hidden input when `name` is given, so it can sit inside a plain form too.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  name,
  size = "md",
  className = "",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  name?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const groupId = useId();
  const index = options.findIndex((o) => o.value === value);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative inline-flex w-full rounded-ctl bg-sunken p-1 ${className}`}
    >
      {name && <input type="hidden" name={name} value={value} />}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-[9px] font-semibold transition-colors ${
              size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-10 px-3 text-sm"
            } ${selected ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${groupId}`}
                className="absolute inset-0 -z-10 rounded-[9px] bg-surface shadow-soft"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              />
            )}
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
