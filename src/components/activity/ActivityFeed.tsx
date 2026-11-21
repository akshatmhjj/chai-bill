"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCheck } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { markActivitySeenAction } from "@/app/(app)/activity/actions";
import { IllustrationQuiet } from "@/components/brand/Illustrations";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import type { Member } from "@/lib/data/context";
import type { ActivityView } from "@/lib/data/queries";
import { dayLabel, dayOfTimestamp } from "@/lib/time";
import { ActivityItem } from "./ActivityItem";

type Filter = "all" | "money" | "shopping";

/** How long the feed stays on screen, with its "New" markers, before it counts as read. */
const READ_AFTER_MS = 2200;

export function ActivityFeed({
  events,
  me,
  members,
  householdId,
  seenAt,
  today,
}: {
  events: ActivityView[];
  me: Member;
  members: Member[];
  householdId: string;
  /** The read marker as it was when the page loaded. "New" is judged against this, not the live value. */
  seenAt: string;
  today: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  const unseen = useMemo(() => events.filter((e) => e.actorId !== me.userId && e.createdAt > seenAt), [events, me.userId, seenAt]);
  const newestUnseen = unseen[0]?.createdAt;
  const unseenIds = useMemo(() => new Set(unseen.map((e) => e.id)), [unseen]);

  // Count the feed as read once it has actually been on screen for a moment.
  useEffect(() => {
    if (!newestUnseen) return;
    const timer = setTimeout(() => startTransition(() => void markActivitySeenAction(householdId, newestUnseen)), READ_AFTER_MS);
    return () => clearTimeout(timer);
  }, [newestUnseen, householdId]);

  const visible = useMemo(
    () =>
      events.filter((e) => {
        if (filter === "all") return true;
        return filter === "shopping" ? e.kind.startsWith("shopping_") : !e.kind.startsWith("shopping_");
      }),
    [events, filter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, ActivityView[]>();
    for (const e of visible) {
      const day = dayOfTimestamp(e.createdAt);
      map.set(day, [...(map.get(day) ?? []), e]);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Segmented<Filter>
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "money", label: "Money" },
            { value: "shopping", label: "Shopping" },
          ]}
        />
      </div>

      {unseen.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3">
          <p className="text-sm font-semibold text-accent-ink">
            {unseen.length} new since your last visit
          </p>
          <Button size="sm" variant="ghost" onClick={() => startTransition(() => void markActivitySeenAction(householdId, newestUnseen as string))}>
            <CheckCheck className="size-4" aria-hidden />
            Mark seen
          </Button>
        </motion.div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            illustration={<IllustrationQuiet className="w-52" />}
            title={filter === "all" ? "Nothing has happened yet" : "Nothing here yet"}
            description="Expenses, payments and shopping changes from both of you show up here as they happen."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-1 text-sm font-semibold text-ink-3">{dayLabel(day, today)}</h2>
              <ul className="divide-y divide-line rounded-card border border-line bg-surface px-3 shadow-soft">
                <AnimatePresence initial={false}>
                  {items.map((event) => (
                    <motion.li key={event.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 420, damping: 36 }}>
                      <ActivityItem event={event} me={me.userId} members={members} isNew={unseenIds.has(event.id)} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
