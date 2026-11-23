import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { avatarOrDefault, type AvatarKey } from "@/lib/avatars";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Member {
  userId: string;
  name: string;
  avatar: AvatarKey;
  joinedAt: string;
}

/** The signed-in person, with their profile. */
export interface PersonContext {
  userId: string;
  email: string | null;
  profile: { name: string; avatar: AvatarKey };
}

export interface NestSummary {
  id: string;
  name: string;
  memberCount: number;
}

/** Everything a screen inside one nest needs. Only built for members of that nest. */
export interface NestContext {
  userId: string;
  email: string | null;
  profile: { name: string; avatar: AvatarKey };
  household: { id: string; name: string };
  members: Member[];
  me: Member;
  /** Everyone else in this nest, in the order they joined. */
  others: Member[];
  /** How far through this nest's activity feed this person has read. */
  seenAt: string;
}

/** The signed-in person and their profile. Null when signed out. Cached per request. */
export const getPersonContext = cache(async (): Promise<PersonContext | null | "no-profile"> => {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: profileRow } = await supabase.from("profiles").select("display_name, avatar_key").eq("user_id", user.id).maybeSingle();
  if (!profileRow) return "no-profile";

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: { name: profileRow.display_name as string, avatar: avatarOrDefault(profileRow.avatar_key) },
  };
});

/** The nests a person belongs to, with member counts. Only the front page and profile need this list. */
export const getMyNests = cache(async (userId: string): Promise<NestSummary[]> => {
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("household_members")
    .select("household_id, households(id, name)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  const ids = (memberships ?? []).map((m) => m.household_id as string);
  const { data: counts } = ids.length
    ? await supabase.from("household_members").select("household_id").in("household_id", ids)
    : { data: [] as { household_id: string }[] };
  const countById = new Map<string, number>();
  for (const row of counts ?? []) countById.set(row.household_id, (countById.get(row.household_id) ?? 0) + 1);

  return (memberships ?? []).map((m) => {
    const h = m.households as unknown as { id: string; name: string } | null;
    return { id: m.household_id as string, name: h?.name ?? "Nest", memberCount: countById.get(m.household_id as string) ?? 1 };
  });
});

/** For screens outside any nest: signed in and with a profile. Otherwise sends the person on. */
export async function requireProfile(): Promise<PersonContext> {
  const person = await getPersonContext();
  if (person === null) redirect("/login");
  if (person === "no-profile") redirect("/onboarding/profile");
  return person;
}

/** The nest context for a member of `nestId`. Null when the person isn't in that nest. */
export const getNestContext = cache(async (nestId: string): Promise<NestContext | null> => {
  const person = await getPersonContext();
  if (!person || person === "no-profile") return null;

  const supabase = await createSupabaseServerClient();
  // Membership, the nest and its members do not depend on each other: fetch them together.
  // Row security hides the nest and its members from anyone who is not a member anyway.
  const [{ data: membership }, { data: household }, { data: memberRows }] = await Promise.all([
    supabase.from("household_members").select("activity_seen_at").eq("household_id", nestId).eq("user_id", person.userId).maybeSingle(),
    supabase.from("households").select("id, name").eq("id", nestId).maybeSingle(),
    supabase.from("household_members").select("user_id, display_name, joined_at").eq("household_id", nestId).order("joined_at"),
  ]);
  if (!membership || !household) return null;

  const ids = (memberRows ?? []).map((m) => m.user_id as string);
  const { data: profileRows } = ids.length
    ? await supabase.from("profiles").select("user_id, avatar_key").in("user_id", ids)
    : { data: [] as { user_id: string; avatar_key: string }[] };
  const avatarByUser = new Map((profileRows ?? []).map((p) => [p.user_id as string, avatarOrDefault(p.avatar_key)]));

  const members: Member[] = (memberRows ?? []).map((m) => ({
    userId: m.user_id as string,
    name: m.display_name as string,
    avatar: avatarByUser.get(m.user_id as string) ?? avatarOrDefault(undefined),
    joinedAt: m.joined_at as string,
  }));

  const me = members.find((m) => m.userId === person.userId);
  if (!me) return null;

  return {
    userId: person.userId,
    email: person.email,
    profile: person.profile,
    household: { id: household.id as string, name: household.name as string },
    members,
    me,
    others: members.filter((m) => m.userId !== person.userId),
    seenAt: membership.activity_seen_at as string,
  };
});

/** For a page inside a nest: 404 unless the person is a member of it. */
export async function requireNest(nestId: string): Promise<NestContext> {
  const person = await getPersonContext();
  if (person === null) redirect("/login");
  if (person === "no-profile") redirect("/onboarding/profile");
  const ctx = await getNestContext(nestId);
  if (!ctx) notFound();
  return ctx;
}

/** The count of events by others that this person has not seen yet, in one nest. */
export async function countUnread(ctx: NestContext): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("household_id", ctx.household.id)
    .neq("actor_id", ctx.userId)
    .gt("created_at", ctx.seenAt);
  return count ?? 0;
}
