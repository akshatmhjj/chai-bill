import { LoaderCircle } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[transform,background-color,box-shadow,color,filter] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-soft hover:bg-accent-hover",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-negative-soft text-negative hover:brightness-95",
  soft: "bg-accent-soft text-accent-ink hover:brightness-95",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 rounded-[10px] px-3 text-sm",
  md: "h-11 rounded-ctl px-4 text-[15px]",
  lg: "h-14 rounded-2xl px-6 text-base",
};

/** Class names for a button. Use directly on a <Link> so links and buttons look identical. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${full ? "w-full" : ""} ${className}`;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
}

export function Button({ variant, size, full, loading, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, full, className })}
      {...rest}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
