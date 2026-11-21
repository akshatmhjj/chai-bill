"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useNestPath } from "@/components/nest/NestContext";
import { markActivitySeenAction } from "@/app/(app)/n/[nestId]/activity/actions";
import { AnimatedList } from "@/components/ui/AnimatedList";
import type { Member } from "@/lib/data/context";
import type { ActivityView } from "@/lib/data/queries";
import { ActivityItem } from "./ActivityItem";

/**
 * The latest few things your flatmates did since you last read the feed.
 * Dismissing marks everything up to the newest event as read, and nothing else.
 */
export function NewSinceCard({ events, total, me, members, householdId }: { events: ActivityView[]; total: number; me: string; members: Member[]; householdId: string }) {
  const [pending, startTransition] = useTransition();
  const nestPath = useNestPath();
  const newest = events[0]?.createdAt;

  return (
    <section aria-label="New since your last visit" className="rounded-card border border-accent/30 bg-surface p-4 shadow-soft">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          New since your last visit
        </h2>
        <button
          type="button"
          disabled={pending || !newest}
          onClick={() => newest && startTransition(() => void markActivitySeenAction(householdId, newest))}
          aria-label="Mark as seen"
          className="-mr-1 rounded-full p-1.5 text-ink-3 transition-colors hover:bg-sunken hover:text-ink active:scale-90"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <AnimatedList
        className="divide-y divide-line"
        items={events.map((event) => ({ id: event.id, node: <ActivityItem event={event} me={me} members={members} compact /> }))}
      />
      {total > events.length && (
        <Link href={nestPath("/activity")} className="mt-1 inline-block rounded-lg px-1 py-1 text-sm font-semibold text-accent hover:bg-accent-soft">
          and {total - events.length} more
        </Link>
      )}
    </section>
  );
}
