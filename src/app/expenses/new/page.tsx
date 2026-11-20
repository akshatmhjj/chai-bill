import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayInIndia } from "@/lib/dates/india";
import { ExpenseForm } from "../ExpenseForm";
import { createExpenseAction } from "../actions";

export default async function NewExpensePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { data: members } = membership
    ? await supabase.from("household_members").select("user_id, display_name").eq("household_id", membership.household_id)
    : { data: [] as { user_id: string; display_name: string }[] };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Add expense</h1>
        <Link href="/expenses" className="text-sm text-neutral-600 underline">Back to expenses</Link>
      </header>
      <ExpenseForm
        members={(members ?? []).map((m) => ({ userId: m.user_id, displayName: m.display_name }))}
        currentUserId={userData.user.id}
        hasHousehold={Boolean(membership)}
        action={createExpenseAction}
        submitLabel="Save expense"
        today={todayInIndia()}
      />
    </main>
  );
}
