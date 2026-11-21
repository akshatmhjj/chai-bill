"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { parseExpenseForm } from "@/lib/expenses/form";
import { nestAccess } from "@/lib/nests/access";

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to change this expense.";
  if (message.includes("shares sum to")) return "The shares don't add up to the total. Check the split.";
  if (message.includes("has no shares")) return "Choose at least one person to share this expense.";
  if (message.includes("not found")) return "That expense no longer exists.";
  if (message.includes("not authenticated")) return "Your session has expired. Please sign in again.";
  return "Something went wrong saving the expense. Please try again.";
}

/**
 * Creates an expense (expenseId null) or replaces one, shares and all, in one transaction.
 * The form carries the nest id; personal expenses ignore it.
 */
export async function saveExpenseAction(expenseId: string | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const nestId = String(formData.get("nestId") ?? "");
  const access = await nestAccess(nestId);
  if (!access.ok) return fail(access.error);

  const parsed = parseExpenseForm(formData, access.userId);
  if (!parsed.ok) return fail(parsed.error);

  const { expense } = parsed;
  const { data, error } = await access.supabase.rpc("upsert_expense", {
    p_expense_id: expenseId,
    p_household_id: expense.scope === "shared" ? nestId : null,
    p_scope: expense.scope,
    p_description: expense.description,
    p_amount_paise: expense.amountPaise,
    p_paid_by: expense.paidBy,
    p_split_method: expense.splitMethod,
    p_expense_date: expense.expenseDate,
    p_shares: expense.shares.map((s) => ({ user_id: s.userId, share_paise: s.sharePaise, basis_points: s.basisPoints })),
    p_category: expense.category,
  });
  if (error || typeof data !== "string") return fail(friendly(error?.message ?? ""));

  revalidatePath("/", "layout");
  return { ok: true, id: data };
}

/** Soft delete: the row stays for the audit trail and the activity feed. RLS limits who can do it. */
export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Your session has expired. Please sign in again.");

  const { data, error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", expenseId)
    .is("deleted_at", null)
    .select("id");
  if (error) return fail(friendly(error.message));
  if (!data || data.length === 0) return fail("You can't delete this expense.");

  revalidatePath("/", "layout");
  return { ok: true };
}
