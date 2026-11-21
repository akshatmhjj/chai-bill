"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { parseSettlementForm } from "@/lib/settlements/form";
import { nestAccess } from "@/lib/nests/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You can only record payments you made, within this nest.";
  if (message.includes("not authenticated")) return "Your session has expired. Please sign in again.";
  return "Something went wrong saving the payment. Please try again.";
}

/** Records that the signed-in person paid one of the nest's members. Any amount; partial is fine. */
export async function recordSettlementAction(formData: FormData): Promise<ActionResult> {
  const nestId = String(formData.get("nestId") ?? "");
  const access = await nestAccess(nestId);
  if (!access.ok) return fail(access.error);
  const { supabase, userId: me } = access;

  const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", nestId);
  const parsed = parseSettlementForm(formData, me, (members ?? []).map((m) => m.user_id as string));
  if (!parsed.ok) return fail(parsed.error);

  const { settlement } = parsed;
  const { error } = await supabase.from("settlements").insert({
    household_id: nestId,
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
  if (!data || data.length === 0) return fail("Only the person who recorded a payment can delete it.");

  revalidatePath("/", "layout");
  return { ok: true };
}
