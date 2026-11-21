import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AVATAR_KEYS } from "@/lib/avatars";
import { getAppContext } from "@/lib/data/context";
import { ProfileStep } from "./ProfileStep";

export const metadata: Metadata = { title: "Set up your profile" };

/** A friendly starting name from the email: "akshat.m@x.com" becomes "Akshat". */
function suggestName(email: string | null): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const word = local.split(/[._\-+\d]/)[0] ?? "";
  return word ? word[0].toUpperCase() + word.slice(1) : "";
}

/** A stable first avatar per person, so two roommates rarely start on the same one. */
function suggestAvatar(email: string | null) {
  let hash = 0;
  for (const char of email ?? "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_KEYS[hash % AVATAR_KEYS.length];
}

export default async function ProfilePage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (ctx.household) redirect("/");
  if (ctx.profile) redirect("/onboarding/flat");

  return <ProfileStep suggestedName={suggestName(ctx.email)} suggestedAvatar={suggestAvatar(ctx.email)} />;
}
