"use client";

import { useLive } from "@/components/live/LiveProvider";
import { namesList } from "@/lib/people";

/**
 * "Household · with Akshat and Meera". Names come from the live connection too, so a rename shows
 * up on this line at once rather than waiting for the server data to redraw.
 */
export function NestSubtitle({ householdName, others }: { householdName: string; others: { userId: string; name: string }[] }) {
  const { nameOf } = useLive();
  if (others.length === 0) return <>{householdName}</>;
  return <>{`${householdName} · with ${namesList(others.map((o) => nameOf(o.userId, o.name)))}`}</>;
}
