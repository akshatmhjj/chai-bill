"use client";

import { motion } from "motion/react";
import { Plus, Receipt, Scale, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { isActive, NAV_ITEMS } from "./items";

/**
 * The phone navigation: Home, Expenses, a raised "+", Shopping, Activity.
 * The "+" opens quick actions so the common jobs are one thumb tap away from anywhere.
 */
/** Full-screen forms take over the phone: they have their own close button and a sticky save bar. */
const FULL_SCREEN = [/^\/expenses\/new$/, /^\/expenses\/[^/]+\/edit$/];

export function BottomNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);
  const hidden = FULL_SCREEN.some((pattern) => pattern.test(pathname));

  const items = NAV_ITEMS.filter((i) => i.mobile);
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <>
      <nav
        aria-label="Main"
        hidden={hidden}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-xl lg:hidden ${hidden ? "hidden" : ""}`}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5">
          {left.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} unread={0} />
          ))}
          <div className="flex justify-center">
            <motion.button
              type="button"
              onClick={() => setQuickOpen(true)}
              aria-label="Add something"
              whileTap={{ scale: 0.9 }}
              whileHover={{ y: -1 }}
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lift ring-4 ring-canvas"
            >
              <Plus className="size-7" strokeWidth={2.4} aria-hidden />
            </motion.button>
          </div>
          {right.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              unread={item.href === "/activity" ? unread : 0}
            />
          ))}
        </div>
      </nav>

      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}

function NavLink({ item, active, unread }: { item: (typeof NAV_ITEMS)[number]; active: boolean; unread: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors ${
        active ? "text-accent" : "text-ink-3 hover:text-ink-2"
      }`}
    >
      {active && (
        <motion.span
          layoutId="bottom-nav-pill"
          className="absolute inset-x-2 top-0 h-1 rounded-full bg-accent"
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
        />
      )}
      <span className="relative">
        <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 14 }}
            className="absolute -right-2.5 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-on-accent ring-2 ring-canvas"
            aria-label={`${unread} new`}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </span>
      {item.label}
    </Link>
  );
}

function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const actions = [
    { href: "/expenses/new", title: "Add an expense", hint: "Split it, or keep it personal", icon: Receipt, tone: "bg-accent-soft text-accent-ink" },
    { href: "/balances?settle=1", title: "Record a payment", hint: "Settle up by UPI or cash", icon: Scale, tone: "bg-positive-soft text-positive" },
    { href: "/shopping?add=1", title: "Add to the shopping list", hint: "Milk, eggs, anything", icon: ShoppingBasket, tone: "bg-sunken text-ink-2" },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="What's new?">
      <ul className="flex flex-col gap-2.5 pb-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(action.href);
                }}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-soft transition-transform active:scale-[0.98]"
              >
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${action.tone}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{action.title}</span>
                  <span className="block text-sm text-ink-3">{action.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
