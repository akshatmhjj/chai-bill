import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth/SignOutButton";
import { RealtimeRefresh } from "@/app/RealtimeRefresh";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/money/paise";
import { deleteExpenseAction } from "./actions";

export default async function ExpensesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const me = userData.user.id;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", me)
    .maybeSingle();
  const householdId = membership?.household_id as string | undefined;

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, scope, description, amount_paise, expense_date, paid_by, created_by")
    .is("deleted_at", null)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: members } = householdId
    ? await supabase.from("household_members").select("user_id, display_name").eq("household_id", householdId)
    : { data: [] as { user_id: string; display_name: string }[] };

  const { data: myShares } = await supabase
    .from("expense_shares")
    .select("expense_id, share_paise")
    .eq("user_id", me);

  const names = new Map((members ?? []).map((m) => [m.user_id as string, m.display_name as string]));
  const myShareByExpense = new Map((myShares ?? []).map((s) => [s.expense_id as string, s.share_paise as number]));

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <RealtimeRefresh householdId={householdId ?? null} userId={me} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <nav className="flex gap-3 text-sm text-neutral-600">
            <Link href="/household" className="underline">Household</Link>
            <Link href="/activity" className="underline">Activity</Link>
            <Link href="/shopping" className="underline">Shopping</Link>
          </nav>
        </div>
        <SignOutButton />
      </header>

      <div className="flex gap-3">
        <Link href="/expenses/new" className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-center text-white">
          Add expense
        </Link>
        <Link href="/balances" className="flex-1 rounded-md border border-neutral-400 px-4 py-2 text-center">
          Balances
        </Link>
      </div>

      {(expenses ?? []).length === 0 && <p className="text-sm text-neutral-600">No expenses yet.</p>}

      <ul className="flex flex-col divide-y divide-neutral-200">
        {(expenses ?? []).map((e) => {
          const editable = e.scope === "shared" || e.created_by === me;
          const payer = e.scope === "personal" ? "You" : e.paid_by === me ? "You paid" : `${names.get(e.paid_by as string) ?? "Someone"} paid`;
          const myShare = myShareByExpense.get(e.id as string);
          return (
            <li key={e.id as string} className="flex flex-col gap-1 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{e.description as string}</span>
                <span className="font-mono text-sm">{formatINR(e.amount_paise as number)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>
                  {e.expense_date as string} · {e.scope === "personal" ? "Personal" : payer}
                  {e.scope === "shared" && myShare !== undefined ? ` · your share ${formatINR(myShare)}` : ""}
                </span>
                {editable && (
                  <span className="flex gap-3">
                    <Link href={`/expenses/${e.id as string}/edit`} className="underline">Edit</Link>
                    <form action={deleteExpenseAction.bind(null, e.id as string)}>
                      <button type="submit" className="text-red-600 underline">Delete</button>
                    </form>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
