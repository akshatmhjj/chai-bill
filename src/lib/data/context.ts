import { cache } from "react";
import { redirect } from "next/navigation";
import { avatarOrDefault, type AvatarKey } from "@/lib/avatars";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Member {
  userId: string;
  name: string;
  avatar: AvatarKey;
  joinedAt: string;
}

export interface AppContext {
  userId: string;
  email: string | null;
  /** The person's own profile; null until they finish the first onboarding step. */
  profile: { name: string; avatar: AvatarKey } | null;
  household: { id: string; name: string } | null;
  members: Member[];
  me: Member | null;
  /** Everyone else in the flat, in the order they joined. Empty until someone else joins. */
  others: Member[];
  /** How far through the activity feed this person has read. */
  seenAt: string | null;
}

export type OnboardedContext = AppContext & {
  profile: NonNullable<AppContext["profile"]>;
  household: NonNullable<AppContext["household"]>;
  me: Member;
  seenAt: string;
};

/**
 * Everything the shell needs about the signed-in person, fetched once per request.
 * Returns null when signed out.
 */
export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [{ data: profileRow }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_key").eq("user_id", user.id).maybeSingle(),
    supabase.from("household_members").select("household_id, activity_seen_at").eq("user_id", user.id).maybeSingle(),
  ]);

  const profile = profileRow
    ? { name: profileRow.display_name as string, avatar: avatarOrDefault(profileRow.avatar_key) }
    : null;

  if (!membership) {
    return { userId: user.id, email: user.email ?? null, profile, household: null, members: [], me: null, others: [], seenAt: null };
  }

  const householdId = membership.household_id as string;
  const [{ data: household }, { data: memberRows }] = await Promise.all([
    supabase.from("households").select("id, name").eq("id", householdId).single(),
    supabase.from("household_members").select("user_id, display_name, joined_at").eq("household_id", householdId).order("joined_at"),
  ]);

  const ids = (memberRows ?? []).map((m) => m.user_id as string);
  const { data: profileRows } = ids.length
    ? await supabase.from("profiles").select("user_id, display_name, avatar_key").in("user_id", ids)
    : { data: [] as { user_id: string; display_name: string; avatar_key: string }[] };
  const avatarByUser = new Map((profileRows ?? []).map((p) => [p.user_id as string, avatarOrDefault(p.avatar_key)]));

  const members: Member[] = (memberRows ?? []).map((m) => ({
    userId: m.user_id as string,
    name: m.display_name as string,
    avatar: avatarByUser.get(m.user_id as string) ?? avatarOrDefault(undefined),
    joinedAt: m.joined_at as string,
  }));

  const me = members.find((m) => m.userId === user.id) ?? null;
  const others = members.filter((m) => m.userId !== user.id);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    household: household ? { id: household.id as string, name: household.name as string } : null,
    members,
    me,
    others,
    seenAt: membership.activity_seen_at as string,
  };
});

/** For pages inside the app: signed in, has a profile, and belongs to a flat. Otherwise sends them on. */
export async function requireOnboarded(): Promise<OnboardedContext> {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile) redirect("/onboarding/profile");
  if (!ctx.household || !ctx.me || !ctx.seenAt) redirect("/onboarding/flat");
  return ctx as OnboardedContext;
}

/** The count of events by someone else that this person has not looked at yet. */
export async function countUnread(ctx: OnboardedContext): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("household_id", ctx.household.id)
    .neq("actor_id", ctx.userId)
    .gt("created_at", ctx.seenAt);
  return count ?? 0;
}
