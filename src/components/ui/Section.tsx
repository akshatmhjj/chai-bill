import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** A titled block of a screen, with an optional "see all" link. */
export function Section({
  title,
  href,
  linkLabel = "See all",
  badge,
  children,
  className = "",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          {title}
          {badge}
        </h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft">
            {linkLabel}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
