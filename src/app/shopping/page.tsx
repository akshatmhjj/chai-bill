import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth/SignOutButton";
import { RealtimeRefresh } from "@/app/RealtimeRefresh";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addShoppingItemAction, deleteShoppingItemAction, setShoppingItemBoughtAction } from "./actions";
import { ShoppingAddForm } from "./ShoppingAddForm";

export default async function ShoppingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const me = userData.user.id;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", me)
    .maybeSingle();
  const householdId = (membership?.household_id as string | undefined) ?? null;

  if (!householdId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Shopping</h1>
        <p className="text-sm text-neutral-600">Join a flat first to share a shopping list.</p>
        <Link href="/household" className="underline">Go to household</Link>
      </main>
    );
  }

  const { data: items } = await supabase
    .from("shopping_items")
    .select("id, name, quantity, status, added_by, bought_by, bought_at, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, display_name")
    .eq("household_id", householdId);
  const names = new Map((members ?? []).map((m) => [m.user_id as string, m.display_name as string]));
  const nameOf = (id: string | null | undefined) => (id === me ? "you" : id ? names.get(id) ?? "someone" : "");

  const open = (items ?? []).filter((i) => i.status === "open");
  const bought = (items ?? [])
    .filter((i) => i.status === "bought")
    .sort((a, b) => String(b.bought_at).localeCompare(String(a.bought_at)))
    .slice(0, 20);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <RealtimeRefresh householdId={householdId} userId={me} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shopping</h1>
          <nav className="flex gap-3 text-sm text-neutral-600">
            <Link href="/expenses" className="underline">Expenses</Link>
            <Link href="/balances" className="underline">Balances</Link>
            <Link href="/activity" className="underline">Activity</Link>
          </nav>
        </div>
        <SignOutButton />
      </header>

      <ShoppingAddForm action={addShoppingItemAction} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">To buy</h2>
        {open.length === 0 && <p className="text-sm text-neutral-600">Nothing on the list.</p>}
        <ul className="flex flex-col divide-y divide-neutral-200">
          {open.map((i) => (
            <li key={i.id as string} className="flex items-center justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span>{i.name as string}{i.quantity ? <span className="text-neutral-500"> · {i.quantity as string}</span> : null}</span>
                <span className="text-xs text-neutral-500">added by {nameOf(i.added_by as string)}</span>
              </div>
              <div className="flex gap-3 text-sm">
                <form action={setShoppingItemBoughtAction.bind(null, i.id as string, true)}>
                  <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1 text-white">Bought</button>
                </form>
                <form action={deleteShoppingItemAction.bind(null, i.id as string)}>
                  <button type="submit" className="text-red-600 underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {bought.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Bought recently</h2>
          <ul className="flex flex-col divide-y divide-neutral-200">
            {bought.map((i) => (
              <li key={i.id as string} className="flex items-center justify-between gap-3 py-3 text-neutral-600">
                <div className="flex flex-col">
                  <span className="line-through">{i.name as string}</span>
                  <span className="text-xs">bought by {nameOf(i.bought_by as string)}</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <form action={setShoppingItemBoughtAction.bind(null, i.id as string, false)}>
                    <button type="submit" className="underline">Put back</button>
                  </form>
                  <form action={deleteShoppingItemAction.bind(null, i.id as string)}>
                    <button type="submit" className="text-red-600 underline">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
