"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Records how far through the feed this person has read, up to the newest event they were shown.
 * Using that event's own timestamp (not "now") means anything that arrived while the page was open
 * still counts as unread. The database only ever moves the marker forward.
 */
export async function markActivitySeenAction(householdId: string, untilIso: string): Promise<ActionResult> {
  if (Number.isNaN(Date.parse(untilIso))) return fail("That doesn't look like a valid time.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_activity_seen", { p_household: householdId, p_until: untilIso });
  if (error) return fail("Couldn't update what you've seen.");

  revalidatePath("/", "layout");
  return { ok: true };
}
