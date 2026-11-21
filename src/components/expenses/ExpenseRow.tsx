"use client";

import { Lock } from "lucide-react";
import { Avatar } from "@/components/avatar/Avatar";
import { useLive } from "@/components/live/LiveProvider";
import { Money } from "@/components/ui/Money";
import type { Member } from "@/lib/data/context";
import type { ExpenseView } from "@/lib/data/queries";
import { CATEGORIES } from "@/lib/categories";
import { CategoryTile } from "./CategoryIcon";

/**
 * One expense in a list. Shared expenses show who paid (with their avatar) and your share;
 * personal ones wear a lock so they never get mistaken for something your roommate can see.
 */
export function ExpenseRow({
  expense,
  me,
  members,
  isNew = false,
  showDate,
  onClick,
}: {
  expense: ExpenseView;
  me: string;
  members: Member[];
  /** Added by your roommate since you last looked at the activity feed. */
  isNew?: boolean;
  showDate?: string;
  onClick?: () => void;
}) {
  const { isFresh } = useLive();
  const payer = members.find((m) => m.userId === expense.paidBy);
  const myShare = expense.shares.find((s) => s.userId === me)?.paise;
  const personal = expense.scope === "personal";
  const payerLabel = expense.paidBy === me ? "You paid" : `${payer?.name ?? "Someone"} paid`;

  const body = (
    <>
      <CategoryTile category={expense.category} />
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-ink">{expense.description}</span>
          {isNew && <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-accent">New</span>}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-ink-3">
          {personal ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-2">
              <Lock className="size-3" aria-hidden /> Only you
            </span>
          ) : (
            <Avatar avatar={payer?.avatar} size={16} />
          )}
          {personal ? null : <span className="shrink-0">{payerLabel}</span>}
          {/* The category icon already says it on a phone; spell it out where there is room. */}
          {(showDate || expense.category) && (
            <span className={`min-w-0 truncate ${showDate ? "" : "hidden sm:inline"}`}>
              {personal ? "" : "· "}
              {showDate ?? (expense.category ? CATEGORIES[expense.category].label : "")}
            </span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <Money paise={expense.amountPaise} className="block font-semibold text-ink" />
        {!personal && myShare !== undefined && (
          <span className="block text-xs text-ink-3">
            your share <Money paise={myShare} />
          </span>
        )}
      </span>
    </>
  );

  const className = `-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 py-3 transition-colors ${
    onClick ? "hover:bg-sunken active:bg-sunken" : ""
  } ${isFresh(expense.id) ? "animate-fresh" : ""}`;

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
