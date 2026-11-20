import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayInIndia } from "@/lib/dates/india";
import { ExpenseForm, type ExpenseInitial } from "../../ExpenseForm";
import { updateExpenseAction } from "../../actions";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const me = userData.user.id;

  // RLS hides expenses this user cannot see, so a foreign id returns nothing.
  const { data: expense } = await supabase
    .from("expenses")
    .select("id, scope, description, amount_paise, expense_date, paid_by, created_by, household_id, split_method")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!expense) notFound();
  if (expense.scope === "personal" && expense.created_by !== me) notFound();

  const { data: shares } = await supabase
    .from("expense_shares")
    .select("user_id, share_paise, basis_points")
    .eq("expense_id", id);

  const { data: members } = expense.household_id
    ? await supabase.from("household_members").select("user_id, display_name").eq("household_id", expense.household_id)
    : { data: [] as { user_id: string; display_name: string }[] };

  const exact: Record<string, string> = {};
  const percent: Record<string, string> = {};
  const participants: string[] = [];
  for (const s of shares ?? []) {
    const uid = s.user_id as string;
    participants.push(uid);
    exact[uid] = ((s.share_paise as number) / 100).toFixed(2);
    if (s.basis_points !== null) percent[uid] = ((s.basis_points as number) / 100).toFixed(2);
  }

  const initial: ExpenseInitial = {
    scope: expense.scope as "shared" | "personal",
    description: expense.description as string,
    amount: ((expense.amount_paise as number) / 100).toFixed(2),
    expenseDate: expense.expense_date as string,
    paidBy: expense.paid_by as string,
    splitMethod: expense.split_method as ExpenseInitial["splitMethod"],
    participants,
    exact,
    percent,
  };

  const action = updateExpenseAction.bind(null, id);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Edit expense</h1>
        <Link href="/expenses" className="text-sm text-neutral-600 underline">Back to expenses</Link>
      </header>
      <ExpenseForm
        members={(members ?? []).map((m) => ({ userId: m.user_id, displayName: m.display_name }))}
        currentUserId={me}
        hasHousehold={Boolean(expense.household_id)}
        action={action}
        initial={initial}
        submitLabel="Save changes"
        today={todayInIndia()}
      />
    </main>
  );
}
