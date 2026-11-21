import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/data/context";
import { FLAT_SIZE_CAP } from "@/lib/people";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InviteStep } from "./InviteStep";

export const metadata: Metadata = { title: "Invite your flatmates" };

export default async function InvitePage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile) redirect("/onboarding/profile");
  if (!ctx.household) redirect("/onboarding/flat");
  // A full flat has nobody left to invite.
  if (ctx.members.length >= FLAT_SIZE_CAP) redirect("/");

  // The newest invite that is still usable. Members can read their flat's invites.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("household_invites")
    .select("code, expires_at")
    .eq("household_id", ctx.household.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <InviteStep
      householdId={ctx.household.id}
      householdName={ctx.household.name}
      userId={ctx.userId}
      me={{ name: ctx.profile.name, avatar: ctx.profile.avatar }}
      code={(data?.code as string | undefined) ?? null}
    />
  );
}
