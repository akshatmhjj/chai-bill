import type { Metadata } from "next";
import { PageHeader } from "@/components/nav/PageHeader";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { LoadMore } from "@/components/ui/LoadMore";
import { requireNest } from "@/lib/data/context";
import { loadActivity } from "@/lib/data/queries";
import { todayInIndia } from "@/lib/dates/india";
import { limitFromParam, takePage } from "@/lib/paging";

export const metadata: Metadata = { title: "Activity" };

const PAGE_SIZE = 10;

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ nestId: string }>;
  searchParams: Promise<{ limit?: string }>;
}) {
  const { nestId } = await params;
  const [{ limit: limitParam }, ctx] = await Promise.all([searchParams, requireNest(nestId)]);
  const limit = limitFromParam(limitParam, PAGE_SIZE);
  const { items: events, hasMore } = takePage(await loadActivity(ctx.household.id, limit + 1), limit);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Activity" subtitle={`What's been happening in ${ctx.household.name}`} me={ctx.me} />
      <ActivityFeed events={events} me={ctx.me} members={ctx.members} householdId={ctx.household.id} seenAt={ctx.seenAt} today={todayInIndia()} />
      {hasMore && <LoadMore href={`/n/${nestId}/activity?limit=${limit + PAGE_SIZE}`} label="Show older activity" />}
    </div>
  );
}
