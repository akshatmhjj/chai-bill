import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/data/context";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Already signed in: go straight to the app (it routes on to onboarding if needed).
  const ctx = await getAppContext();
  if (ctx) redirect("/");

  const { error } = await searchParams;
  return <LoginForm linkError={error === "link"} />;
}
