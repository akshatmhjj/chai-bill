import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar/Avatar";
import type { AvatarKey } from "@/lib/avatars";

/**
 * A page title with an optional subtitle and action. On phones the person's avatar sits at the
 * right as a shortcut to their profile (on desktop the sidebar already has it).
 */
export function PageHeader({
  title,
  subtitle,
  action,
  me,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: React.ReactNode;
  me: { name: string; avatar: AvatarKey };
}) {
  return (
    <header className="flex items-start justify-between gap-3 pb-5 pt-2 lg:pt-0">
      <div className="min-w-0">
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <Link href="/profile" aria-label={`Profile, ${me.name}`} className="rounded-full transition-transform active:scale-95 lg:hidden">
          <Avatar avatar={me.avatar} size={40} ring="surface" className="shadow-soft" />
        </Link>
      </div>
    </header>
  );
}
