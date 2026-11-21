/** The Chai Bill mark: a cup with steam, in the accent colour. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <rect width="40" height="40" rx="12" className="fill-accent" />
      <path d="M13 12.5c-1.4-1.5-1.4-3 0-4.6M20 11.5c-1.6-1.7-1.6-3.6 0-5.4M27 12.5c-1.4-1.5-1.4-3 0-4.6" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.8" fill="none" strokeLinecap="round" transform="translate(0 3)" className="[stroke:var(--on-accent)]" />
      <path d="M9.5 18.5h19v5.6c0 5.4-4.2 9.4-9.5 9.4s-9.5-4-9.5-9.4z" className="fill-[var(--on-accent)]" />
      <path d="M28.5 21h1.6a3.1 3.1 0 0 1 0 6.2h-2.4" fill="none" strokeWidth="2.3" strokeLinecap="round" className="stroke-[var(--on-accent)]" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display text-[1.35rem] font-semibold leading-none tracking-tight text-ink ${className}`}>Chai Bill</span>;
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <Wordmark />
    </span>
  );
}
