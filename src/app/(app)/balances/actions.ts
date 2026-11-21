"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { parseSettlementForm } from "@/lib/settlements/form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You can only record payments you made, within your flat.";
  if (message.includes("not authenticated")) return "Your session has expired. Please sign in again.";
  return "Something went wrong saving the payment. Please try again.";
}

/** Records that the signed-in person paid their roommate. Any amount is fine: partial payments are normal. */
export async function recordSettlementAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Your session has expired. Please sign in again.");
  const me = auth.user.id;

  const { data: membership } = await supabase.from("household_members").select("household_id").eq("user_id", me).maybeSingle();
  if (!membership) return fail("Join a flat before recording payments.");

  const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", membership.household_id);
  const parsed = parseSettlementForm(formData, me, (members ?? []).map((m) => m.user_id as string));
  if (!parsed.ok) return fail(parsed.error);

  const { settlement } = parsed;
  const { error } = await supabase.from("settlements").insert({
    household_id: membership.household_id,
    from_user: me,
    to_user: settlement.toUserId,
    amount_paise: settlement.amountPaise,
    currency: "INR",
    method: settlement.method,
    reference: settlement.reference,
    note: settlement.note,
    settled_on: settlement.settledOn,
    created_by: me,
  });
  if (error) return fail(friendly(error.message));

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Soft delete. Only the person who recorded a payment can remove it (enforced by RLS). */
export async function deleteSettlementAction(settlementId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Your session has expired. Please sign in again.");

  const { data, error } = await supabase
    .from("settlements")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", settlementId)
    .is("deleted_at", null)
    .select("id");
  if (error) return fail(friendly(error.message));
  // RLS hides other people's payments, so "nothing updated" means it is not theirs to delete.
  if (!data || data.length === 0) return fail("Only the person who recorded a payment can delete it.");

  revalidatePath("/", "layout");
  return { ok: true };
}
