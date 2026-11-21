import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPersonContext } from "@/lib/data/context";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Already signed in: go on to the front page (or set up a profile first).
  const person = await getPersonContext();
  if (person === "no-profile") redirect("/onboarding/profile");
  if (person) redirect("/");

  const { error } = await searchParams;
  return <LoginForm linkError={error === "link"} />;
}
