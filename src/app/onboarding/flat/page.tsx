import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/data/context";
import { FlatStep } from "./FlatStep";

export const metadata: Metadata = { title: "Your flat" };

export default async function FlatPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile) redirect("/onboarding/profile");
  if (ctx.household) redirect("/");

  return <FlatStep name={ctx.profile.name} avatar={ctx.profile.avatar} />;
}
