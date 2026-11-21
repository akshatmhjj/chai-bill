"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Listens for changes to the household's data and re-renders the current server page when
 * something changes. Supabase only sends rows the user can read: RLS applies to Realtime, but
 * only if the socket carries the user's access token (otherwise every row is silently hidden).
 *
 * Expense shares always change together with their expense row, so listening to `expenses`
 * is enough for them. Bursts of changes are collapsed into one refresh.
 */
export function RealtimeRefresh({ householdId, userId }: { householdId: string | null; userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase.channel(`chai-bill-${householdId ?? "none"}-${userId}`);
    if (householdId) {
      for (const table of ["expenses", "settlements", "activity_events", "shopping_items"]) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
          refresh,
        );
      }
    }
    // Personal expenses have no household, so listen for the user's own rows.
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "expenses", filter: `created_by=eq.${userId}` },
      refresh,
    );

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (!cancelled) channel.subscribe();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [householdId, userId, router]);

  return null;
}
