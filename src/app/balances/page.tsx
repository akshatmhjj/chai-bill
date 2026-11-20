import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth/SignOutButton";
import { RealtimeRefresh } from "@/app/RealtimeRefresh";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildHouseholdSummary } from "@/lib/money/summary";
import { formatINR } from "@/lib/money/paise";
import { todayInIndia } from "@/lib/dates/india";
import { deleteSettlementAction, recordSettlementAction } from "./actions";
import { SettlementForm } from "./SettlementForm";

export default async function BalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; amount?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const me = userData.user.id;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", me)
    .maybeSingle();

  if (!membership) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Balances</h1>
        <p className="text-sm text-neutral-600">Join a flat first to see balances.</p>
        <Link href="/household" className="underline">Go to household</Link>
      </main>
    );
  }
  const householdId = membership.household_id as string;

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, display_name")
    .eq("household_id", householdId);
  const names = new Map((members ?? []).map((m) => [m.user_id as string, m.display_name as string]));
  const nameOf = (id: string) => (id === me ? "You" : names.get(id) ?? "Someone");
  // Mid-sentence "You" should read "you".
  const inline = (id: string) => (id === me ? "you" : nameOf(id));

  // Shared expenses only. Personal expenses never affect household balances.
  const { data: expenseRows } = await supabase
    .from("expenses")
    .select("id, paid_by, amount_paise")
    .eq("household_id", householdId)
    .eq("scope", "shared")
    .is("deleted_at", null);
  const expenseIds = (expenseRows ?? []).map((e) => e.id as string);
  const { data: shareRows } = expenseIds.length
    ? await supabase.from("expense_shares").select("expense_id, user_id, share_paise").in("expense_id", expenseIds)
    : { data: [] as { expense_id: string; user_id: string; share_paise: number }[] };

  const { data: settlementRows } = await supabase
    .from("settlements")
    .select("id, from_user, to_user, amount_paise, method, reference, note, settled_on, created_by")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("settled_on", { ascending: false })
    .order("created_at", { ascending: false });

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const summary = buildHouseholdSummary({
    members: memberIds,
    expenses: (expenseRows ?? []).map((e) => ({
      id: e.id as string,
      payerId: e.paid_by as string,
      totalPaise: e.amount_paise as number,
      shares: (shareRows ?? [])
        .filter((s) => s.expense_id === e.id)
        .map((s) => ({ memberId: s.user_id, paise: s.share_paise })),
    })),
    settlements: (settlementRows ?? []).map((s) => ({
      id: s.id as string,
      fromId: s.from_user as string,
      toId: s.to_user as string,
      paise: s.amount_paise as number,
    })),
  });

  const others = (members ?? [])
    .filter((m) => m.user_id !== me)
    .map((m) => ({ userId: m.user_id as string, displayName: m.display_name as string }));

  const suggestedAmount = query.amount && /^\d+(\.\d{1,2})?$/.test(query.amount) ? query.amount : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 p-6">
      <RealtimeRefresh householdId={householdId} userId={me} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Balances</h1>
          <nav className="flex gap-3 text-sm text-neutral-600">
            <Link href="/expenses" className="underline">Expenses</Link>
            <Link href="/activity" className="underline">Activity</Link>
          </nav>
        </div>
        <SignOutButton />
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Where things stand</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {memberIds.map((id) => {
            const net = summary.balances[id];
            const isMe = id === me;
            const text =
              net > 0
                ? `${isMe ? "are" : "is"} owed ${formatINR(net)}`
                : net < 0
                  ? `${isMe ? "owe" : "owes"} ${formatINR(-net)}`
                  : `${isMe ? "are" : "is"} all square`;
            return (
              <li key={id}>
                <span className="font-medium">{nameOf(id)}</span> {text}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Settle up</h2>
        {summary.transfers.length === 0 && <p className="text-sm text-neutral-600">Nothing to settle.</p>}
        <ul className="flex flex-col gap-3">
          {summary.transfers.map((t) => (
            <li key={`${t.from}-${t.to}`} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {t.from === me ? "You pay" : `${nameOf(t.from)} pays`} {inline(t.to)}{" "}
                <span className="font-mono">{formatINR(t.paise)}</span>
              </span>
              {t.from === me && (
                <Link
                  href={`/balances?to=${t.to}&amount=${(t.paise / 100).toFixed(2)}#record`}
                  className="rounded-md border border-neutral-400 px-2 py-1 text-xs"
                >
                  Record
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section id="record" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Record a payment</h2>
        {others.length === 0 ? (
          <p className="text-sm text-neutral-600">Invite your roommate first.</p>
        ) : (
          <SettlementForm
            others={others}
            action={recordSettlementAction}
            defaultTo={query.to}
            defaultAmount={suggestedAmount}
            today={todayInIndia()}
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">History</h2>
        {(settlementRows ?? []).length === 0 && <p className="text-sm text-neutral-600">No payments recorded yet.</p>}
        <ul className="flex flex-col divide-y divide-neutral-200">
          {(settlementRows ?? []).map((s) => {
            const mine = s.created_by === me;
            const description =
              s.from_user === me
                ? `You paid ${inline(s.to_user as string)}`
                : `${nameOf(s.from_user as string)} paid you`;
            return (
              <li key={s.id as string} className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span>{description} <span className="font-mono">{formatINR(s.amount_paise as number)}</span></span>
                  <span className="text-xs text-neutral-600">{s.settled_on as string}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>
                    {(s.method as string).toUpperCase()}
                    {s.reference ? ` · ${s.reference as string}` : ""}
                    {s.note ? ` · ${s.note as string}` : ""}
                  </span>
                  {mine && (
                    <form action={deleteSettlementAction.bind(null, s.id as string)}>
                      <button type="submit" className="text-red-600 underline">Delete</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
