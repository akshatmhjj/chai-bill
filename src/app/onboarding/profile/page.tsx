import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AVATAR_KEYS } from "@/lib/avatars";
import { getPersonContext } from "@/lib/data/context";
import { ProfileStep } from "./ProfileStep";

export const metadata: Metadata = { title: "Set up your profile" };

/** A friendly starting name from the email: "akshat.m@x.com" becomes "Akshat". */
function suggestName(email: string | null): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const word = local.split(/[._\-+\d]/)[0] ?? "";
  return word ? word[0].toUpperCase() + word.slice(1) : "";
}

/** A stable first avatar per person, so housemates rarely start on the same one. */
function suggestAvatar(email: string | null) {
  let hash = 0;
  for (const char of email ?? "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_KEYS[hash % AVATAR_KEYS.length];
}

export default async function ProfilePage() {
  const person = await getPersonContext();
  if (person === null) redirect("/login");
  if (person !== "no-profile") redirect("/");

  // getPersonContext says "no-profile" for a new person; their email is needed for suggestions.
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? null;

  return <ProfileStep suggestedName={suggestName(email)} suggestedAvatar={suggestAvatar(email)} />;
}
