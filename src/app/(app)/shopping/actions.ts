"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { parseShoppingInput } from "@/lib/shopping/form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function member() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { supabase, userId: null, householdId: null };
  const { data } = await supabase.from("household_members").select("household_id").eq("user_id", auth.user.id).maybeSingle();
  return { supabase, userId: auth.user.id, householdId: (data?.household_id as string | undefined) ?? null };
}

export async function addShoppingItemAction(input: { name: string; quantity?: string }): Promise<ActionResult<{ id: string }>> {
  const { supabase, userId, householdId } = await member();
  if (!userId) return fail("Your session has expired. Please sign in again.");
  if (!householdId) return fail("Join a flat before adding to the shopping list.");

  const parsed = parseShoppingInput(input);
  if (!parsed.ok) return fail(parsed.error);

  const { data, error } = await supabase
    .from("shopping_items")
    .insert({ household_id: householdId, name: parsed.item.name, quantity: parsed.item.quantity, added_by: userId })
    .select("id")
    .single();
  if (error || !data) return fail("Couldn't add that item. Please try again.");

  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string };
}

/** Marks an item bought, or puts it back. Keeps the bought_by/bought_at rule in the database true. */
export async function setShoppingBoughtAction(itemId: string, bought: boolean): Promise<ActionResult> {
  const { supabase, userId } = await member();
  if (!userId) return fail("Your session has expired. Please sign in again.");

  const { data, error } = await supabase
    .from("shopping_items")
    .update(bought ? { status: "bought", bought_by: userId, bought_at: new Date().toISOString() } : { status: "open", bought_by: null, bought_at: null })
    .eq("id", itemId)
    .select("id");
  if (error) return fail("Couldn't update that item. Please try again.");
  // RLS and deletes mean "no rows" is a real outcome (someone removed it first), not a success.
  if (!data || data.length === 0) return fail("That item is no longer on the list.");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteShoppingItemAction(itemId: string): Promise<ActionResult> {
  const { supabase, userId } = await member();
  if (!userId) return fail("Your session has expired. Please sign in again.");

  const { data, error } = await supabase.from("shopping_items").delete().eq("id", itemId).select("id");
  if (error) return fail("Couldn't remove that item. Please try again.");
  if (!data || data.length === 0) return fail("That item is already gone.");

  revalidatePath("/", "layout");
  return { ok: true };
}
