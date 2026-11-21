import type { Metadata } from "next";
import { getPersonContext } from "@/lib/data/context";
import { JoinLink } from "./JoinLink";

export const metadata: Metadata = { title: "Join a nest" };

/** Opened from a shared link or QR. Works for people who are signed out: they sign in, then come back here. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const person = await getPersonContext();
  const state = person === null ? "signed-out" : person === "no-profile" ? "no-profile" : "ready";
  return <JoinLink code={decodeURIComponent(code)} state={state} />;
}
