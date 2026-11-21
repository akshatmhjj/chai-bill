/** A placeholder block that pulses softly while data loads. Shapes should mirror the final layout. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-shimmer rounded-xl bg-line/70 ${className}`} />;
}

/** A skeleton that looks like a list row: tile, two lines, and an amount. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3" aria-hidden>
      <Skeleton className="size-11 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="h-4 w-14" />
    </div>
  );
}
