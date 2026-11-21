import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NestAccess = { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; userId: string } | { ok: false; error: string };

/**
 * Checks the signed-in person is a member of `nestId`. Server actions call this first, so an id
 * from a form can never point them at a nest they don't belong to. Row-level security is the
 * real guard; this gives a clear message instead of a silent no-op.
 */
export async function nestAccess(nestId: string | null | undefined): Promise<NestAccess> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (!nestId) return { ok: false, error: "Choose a nest first." };
  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("household_id", nestId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "You're not a member of that nest." };
  return { ok: true, supabase, userId: auth.user.id };
}
