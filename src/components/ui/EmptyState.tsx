/** A friendly empty state: an illustration, a human line, and one obvious next step. */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  className = "",
}: {
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${className}`}>
      {illustration && <div className="mb-4">{illustration}</div>}
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-balance text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
