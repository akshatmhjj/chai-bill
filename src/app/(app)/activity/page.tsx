import type { Metadata } from "next";
import { PageHeader } from "@/components/nav/PageHeader";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { requireOnboarded } from "@/lib/data/context";
import { loadActivity } from "@/lib/data/queries";
import { todayInIndia } from "@/lib/dates/india";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const ctx = await requireOnboarded();
  const events = await loadActivity(ctx.household.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Activity" subtitle={`What's been happening in ${ctx.household.name}`} me={ctx.me} />
      <ActivityFeed events={events} me={ctx.me} members={ctx.members} householdId={ctx.household.id} seenAt={ctx.seenAt} today={todayInIndia()} />
    </div>
  );
}
