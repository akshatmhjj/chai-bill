"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarStack } from "@/components/avatar/Avatar";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonStyles } from "@/components/ui/Button";
import type { AvatarKey } from "@/lib/avatars";
import { namesList } from "@/lib/people";
import { isActive, NAV_ITEMS } from "./items";

interface Person {
  name: string;
  avatar: AvatarKey;
}

/** Desktop navigation: a fixed sidebar with the household always in view. */
export function SideNav({ me, others, householdName, unread }: { me: Person; others: Person[]; householdName: string; unread: number }) {
  const pathname = usePathname();
  const people = [me, ...others];
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/" className="px-2" aria-label="Chai Bill home">
        <Logo />
      </Link>

      <Link href="/expenses/new" className={buttonStyles({ size: "lg", full: true, className: "mt-7" })}>
        <Plus className="size-5" strokeWidth={2.4} aria-hidden />
        Add expense
      </Link>

      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors ${
                active ? "text-accent-ink" : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="side-nav-active"
                  className="absolute inset-0 rounded-xl bg-accent-soft"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="relative size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span className="relative flex-1">{item.label}</span>
              {item.href === "/activity" && unread > 0 && (
                <span className="relative rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent" aria-label={`${unread} new`}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-soft">
          <div className="flex items-center gap-3">
            <AvatarStack people={people.slice(0, 3)} size={34} />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold leading-tight">{householdName}</p>
              <p className="truncate text-xs text-ink-3">{others.length ? `${people.length} people · ${namesList(people.map((p) => p.name))}` : "Waiting for your flatmates"}</p>
            </div>
          </div>
        </div>
        <ThemeToggle iconOnly />
        <Link
          href="/profile"
          className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sunken ${pathname.startsWith("/profile") ? "bg-sunken" : ""}`}
        >
          <Avatar avatar={me.avatar} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{me.name}</span>
            <span className="block text-xs text-ink-3">Profile and settings</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
