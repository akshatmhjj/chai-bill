"use client";

import { Banknote, CircleCheck, Pencil, Receipt, ShoppingBasket, Trash2, Undo2, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/avatar/Avatar";
import { useLive } from "@/components/live/LiveProvider";
import { Money } from "@/components/ui/Money";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { describeActivityParts } from "@/lib/activity/describe";
import type { Member } from "@/lib/data/context";
import type { ActivityView } from "@/lib/data/queries";

const KIND_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  expense_added: { icon: Receipt, tone: "text-accent" },
  expense_edited: { icon: Pencil, tone: "text-ink-2" },
  expense_deleted: { icon: Trash2, tone: "text-negative" },
  settlement_recorded: { icon: Banknote, tone: "text-positive" },
  settlement_deleted: { icon: Undo2, tone: "text-negative" },
  shopping_added: { icon: ShoppingBasket, tone: "text-accent" },
  shopping_bought: { icon: CircleCheck, tone: "text-positive" },
  shopping_reopened: { icon: Undo2, tone: "text-ink-2" },
  shopping_deleted: { icon: Trash2, tone: "text-negative" },
};

/**
 * One event: who did it (their avatar, with a small badge for the kind of event), what happened,
 * and when. Events from your roommate that you haven't seen yet are marked "New".
 */
export function ActivityItem({ event, me, members, isNew = false, compact = false }: { event: ActivityView; me: string; members: Member[]; isNew?: boolean; compact?: boolean }) {
  const { isFresh } = useLive();
  const actor = members.find((m) => m.userId === event.actorId);
  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? "Someone";
  const parts = describeActivityParts({ kind: event.kind, actor_id: event.actorId, payload: event.payload, created_at: event.createdAt }, nameOf, me);
  const style = KIND_ICON[event.kind] ?? { icon: Receipt, tone: "text-ink-2" };
  const Icon = style.icon;

  return (
    <div
      className={`relative flex items-start gap-3 rounded-2xl ${compact ? "py-2.5" : "px-2 py-3"} ${compact ? "" : "-mx-2"} ${
        isNew ? "bg-accent-soft/50" : ""
      } ${isFresh(event.entityId) ? "animate-fresh" : ""}`}
    >
      {isNew && <span aria-hidden className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-accent" />}
      <Avatar avatar={actor?.avatar} size={compact ? 36 : 40} badge={<Icon className={`size-full p-[3px] ${style.tone}`} strokeWidth={2.4} />} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug text-ink-2">
          <strong className="font-semibold text-ink">{parts.actor}</strong> {parts.verb}
          {parts.subject && <> <strong className="font-semibold text-ink">{parts.subject}</strong></>}
          {parts.amountPaise !== undefined && <> <Money paise={parts.amountPaise} className="font-semibold text-ink" /></>}
          {parts.tail && <> {parts.tail}</>}
          {parts.extra && <span className="text-ink-3"> · {parts.extra}</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
          <RelativeTime iso={event.createdAt} />
          {isNew && <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-on-accent">New</span>}
        </p>
      </div>
    </div>
  );
}
