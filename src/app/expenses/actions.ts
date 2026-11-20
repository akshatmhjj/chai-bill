"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseExpenseForm } from "@/lib/expenses/form";

export type ExpenseActionState = { error?: string } | null;

function friendlyError(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to change this expense.";
  if (message.includes("shares sum to")) return "The shares don't add up to the total. Check the split.";
  if (message.includes("has no shares")) return "Choose at least one person to share this expense.";
  if (message.includes("not found")) return "That expense no longer exists.";
  if (message.includes("not authenticated")) return "Your session has expired. Sign in again.";
  return "Something went wrong saving the expense. Please try again.";
}

async function currentContext() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { supabase, userId: null, householdId: null };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  return {
    supabase,
    userId: userData.user.id,
    householdId: (membership?.household_id as string | undefined) ?? null,
  };
}

async function saveExpense(expenseId: string | null, _prev: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  const { supabase, userId, householdId } = await currentContext();
  if (!userId) return { error: "Your session has expired. Sign in again." };

  const parsed = parseExpenseForm(formData, userId);
  if (!parsed.ok) return { error: parsed.error };

  const { expense } = parsed;
  if (expense.scope === "shared" && !householdId) {
    return { error: "Join a flat before adding shared expenses." };
  }

  const { error } = await supabase.rpc("upsert_expense", {
    p_expense_id: expenseId,
    p_household_id: expense.scope === "shared" ? householdId : null,
    p_scope: expense.scope,
    p_description: expense.description,
    p_amount_paise: expense.amountPaise,
    p_paid_by: expense.paidBy,
    p_split_method: expense.splitMethod,
    p_expense_date: expense.expenseDate,
    p_shares: expense.shares.map((s) => ({
      user_id: s.userId,
      share_paise: s.sharePaise,
      basis_points: s.basisPoints,
    })),
  });
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function createExpenseAction(prev: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  return saveExpense(null, prev, formData);
}

export async function updateExpenseAction(
  expenseId: string,
  prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  return saveExpense(expenseId, prev, formData);
}

/** Soft delete: the row stays for the audit trail and the activity feed. RLS limits who can do it. */
export async function deleteExpenseAction(expenseId: string): Promise<void> {
  const { supabase, userId } = await currentContext();
  if (!userId) redirect("/login");

  await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", expenseId)
    .is("deleted_at", null);

  revalidatePath("/expenses");
}
