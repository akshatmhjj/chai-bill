"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { useToast } from "@/components/ui/Toast";
import { describeActivity, type ActivityRow } from "@/lib/activity/describe";
import type { AvatarKey } from "@/lib/avatars";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface LivePerson {
  userId: string;
  name: string;
  avatar: AvatarKey;
}

interface LiveContextValue {
  /** True for a few seconds after your roommate changes the thing with this id. */
  isFresh: (id: string) => boolean;
  /** The name a person is known by right now: their latest rename if one arrived live, else `fallback`. */
  nameOf: (userId: string, fallback: string) => string;
}

const LiveContext = createContext<LiveContextValue>({ isFresh: () => false, nameOf: (_id, fallback) => fallback });

export function useLive(): LiveContextValue {
  return useContext(LiveContext);
}

const FRESH_MS = 6000;

/**
 * While a link is being followed, live updates wait. A refresh started mid-navigation cancels the
 * navigation, which is why a tap on Edit used to need several goes.
 */
let navigatingUntil = 0;
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (link) navigatingUntil = Date.now() + 2500;
    },
    true,
  );
}

function refetchCurrentPage(router: { refresh: () => void }, retry: () => void) {
  if (Date.now() < navigatingUntil) return retry();
  router.refresh();
}

/**
 * One realtime subscription for the whole signed-in app.
 *
 * It does three things when something changes: refreshes the server-rendered data (so balances,
 * lists and the dashboard all update together), announces what your roommate did in a toast with
 * their avatar, and marks the changed item "fresh" so lists can make it glow briefly.
 *
 * Supabase only sends rows this user may read (RLS applies), but only if the socket carries the
 * user's token, so the token is set before subscribing.
 */
export function LiveProvider({
  householdId,
  userId,
  people,
  children,
}: {
  householdId: string;
  userId: string;
  people: LivePerson[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  // Names that changed while this page is open. Server data is also refreshed, but the names are shown
  // from here so a rename reaches every screen at once.
  const [renamed, setRenamed] = useState<Readonly<Record<string, string>>>({});
  const peopleRef = useRef(people);
  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const freshTimers = new Set<ReturnType<typeof setTimeout>>();

    const refresh = () => {
      clearTimeout(refreshTimer);
      const run = (): void => {
        refreshTimer = setTimeout(() => refetchCurrentPage(router, () => run()), 250);
      };
      clearTimeout(refreshTimer);
      run();
    };

    const markFresh = (id: string) => {
      setFresh((current) => new Set(current).add(id));
      const timer = setTimeout(() => {
        freshTimers.delete(timer);
        setFresh((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, FRESH_MS);
      freshTimers.add(timer);
    };

    const nameOf = (id: string) => peopleRef.current.find((p) => p.userId === id)?.name ?? "Someone";

    const channel = supabase.channel(`chai-live-${householdId}-${userId}`);

    // The activity feed is the source of truth for "what did my roommate just do".
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_events", filter: `household_id=eq.${householdId}` },
      (change) => {
        const row = change.new as { actor_id: string; kind: string; entity_id: string; payload: Record<string, unknown>; created_at: string };
        refresh();
        if (row.actor_id === userId) return;
        markFresh(row.entity_id);
        const actor = peopleRef.current.find((p) => p.userId === row.actor_id);
        const activity: ActivityRow = { kind: row.kind, actor_id: row.actor_id, payload: row.payload, created_at: row.created_at };
        toast({
          title: describeActivity(activity, nameOf, userId),
          tone: "activity",
          leading: actor ? <Avatar avatar={actor.avatar} size={32} /> : undefined,
        });
      },
    );

    // Anything else that changes the picture just triggers a refresh.
    for (const table of ["expenses", "settlements", "shopping_items"]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
        refresh,
      );
    }
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "expenses", filter: `created_by=eq.${userId}` },
      refresh,
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "household_members", filter: `household_id=eq.${householdId}` },
      (change) => {
        const row = change.new as { user_id: string; display_name: string };
        refresh();
        if (row.user_id !== userId) {
          toast({ title: `${row.display_name} joined your nest`, description: "You can start splitting things now." });
        }
      },
    );
    // A rename changes what the page shows for everyone. A plain refresh can be dropped here, so this
    // re-navigates to the same page, which always draws the new names.
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      (change) => {
        const row = change.new as { user_id?: string; display_name?: string };
        if (row.user_id && row.display_name) setRenamed((current) => ({ ...current, [row.user_id as string]: row.display_name as string }));
        refresh();
      },
    );
    // A name change is written to the flat's member row too, so listen there as well.
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "household_members", filter: `household_id=eq.${householdId}` },
      refresh,
    );

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (!cancelled) channel.subscribe();
    })();

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
      freshTimers.forEach(clearTimeout);
      supabase.removeChannel(channel);
    };
  }, [householdId, userId, router, toast]);

  const value = useMemo<LiveContextValue>(
    () => ({ isFresh: (id) => fresh.has(id), nameOf: (userId, fallback) => renamed[userId] ?? fallback }),
    [fresh, renamed],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
