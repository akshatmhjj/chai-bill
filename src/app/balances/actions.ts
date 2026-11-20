"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseSettlementForm } from "@/lib/settlements/form";

export type SettlementActionState = { error?: string } | null;

function friendlyError(message: string): string {
  if (message.includes("row-level security")) return "You can only record payments within your flat.";
  if (message.includes("not authenticated")) return "Your session has expired. Sign in again.";
  return "Something went wrong saving the payment. Please try again.";
}

/** Records that the signed-in user paid another member. Partial amounts are fine. */
export async function recordSettlementAction(_prev: SettlementActionState, formData: FormData): Promise<SettlementActionState> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Your session has expired. Sign in again." };
  const me = userData.user.id;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", me)
    .maybeSingle();
  if (!membership) return { error: "Join a flat before recording payments." };

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", membership.household_id);
  const memberIds = (members ?? []).map((m) => m.user_id as string);

  const parsed = parseSettlementForm(formData, me, memberIds);
  if (!parsed.ok) return { error: parsed.error };

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
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/balances");
  redirect("/balances");
}

/** Soft delete. Only the person who recorded a payment can remove it (enforced by RLS). */
export async function deleteSettlementAction(settlementId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  await supabase
    .from("settlements")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", settlementId)
    .is("deleted_at", null);

  revalidatePath("/balances");
}
