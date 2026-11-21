import { forwardRef, useId } from "react";

export const inputStyles =
  "h-12 w-full rounded-ctl border border-line bg-surface px-3.5 text-base text-ink shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] outline-none transition-[border-color,box-shadow] placeholder:text-ink-3/70 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  /** Visually hide the label (it stays for screen readers). */
  hideLabel?: boolean;
  trailing?: React.ReactNode;
}

/** A labelled text input with optional hint and error. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, hideLabel, trailing, className = "", id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "text-sm font-semibold text-ink-2"}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputStyles} ${trailing ? "pr-12" : ""} ${error ? "border-negative focus:border-negative focus:ring-negative/15" : ""} ${className}`}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
