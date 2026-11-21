"use client";

import { forwardRef } from "react";

/**
 * The big rupee amount field. It is as wide as what is typed and steps its font size down for long
 * numbers, so "₹1,25,000.50" never clips on a small phone.
 */
export const AmountInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (value: string) => void; id: string; invalid?: boolean; size?: "xl" | "lg" }
>(function AmountInput({ value, onChange, id, invalid, size = "xl" }, ref) {
  const length = Math.max(1, value.length);
  // Display digits run about 0.62em wide. Smaller type for longer numbers keeps it on screen.
  const scale = size === "xl" ? (length <= 6 ? 4.5 : length <= 8 ? 3.5 : 2.75) : length <= 6 ? 3.75 : length <= 8 ? 3 : 2.5;
  return (
    <div className="flex items-baseline justify-center gap-2">
      <span className="font-display font-semibold text-ink-3" style={{ fontSize: `${scale * 0.62}rem` }} aria-hidden>
        ₹
      </span>
      <input
        id={id}
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? true : undefined}
        style={{ fontSize: `${scale}rem`, width: `${length * 0.62 + 0.4}em`, maxWidth: "80vw" }}
        className="tabular bg-transparent text-center font-display font-semibold leading-tight text-ink outline-none placeholder:text-line-strong"
      />
    </div>
  );
});
