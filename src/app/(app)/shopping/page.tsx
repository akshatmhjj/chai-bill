import type { Metadata } from "next";
import { PageHeader } from "@/components/nav/PageHeader";
import { ShoppingList } from "@/components/shopping/ShoppingList";
import { requireOnboarded } from "@/lib/data/context";
import { loadShopping } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Shopping" };

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const [{ add }, ctx] = await Promise.all([searchParams, requireOnboarded()]);
  const items = await loadShopping(ctx.household.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Shopping" subtitle={`Shared with ${ctx.roommate?.name ?? "your roommate"}`} me={ctx.me} />
      <ShoppingList items={items} me={ctx.me} members={ctx.members} seenAt={ctx.seenAt} focusAdd={add === "1"} />
    </div>
  );
}
