"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseShoppingForm } from "@/lib/shopping/form";

export type ShoppingActionState = { error?: string } | null;

async function currentMember() {
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

export async function addShoppingItemAction(_prev: ShoppingActionState, formData: FormData): Promise<ShoppingActionState> {
  const { supabase, userId, householdId } = await currentMember();
  if (!userId) return { error: "Your session has expired. Sign in again." };
  if (!householdId) return { error: "Join a flat before adding to the shopping list." };

  const parsed = parseShoppingForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase.from("shopping_items").insert({
    household_id: householdId,
    name: parsed.item.name,
    quantity: parsed.item.quantity,
    added_by: userId,
  });
  if (error) return { error: "Couldn't add that item. Please try again." };

  revalidatePath("/shopping");
  redirect("/shopping");
}

/** Marks an item bought, or puts it back on the list. Keeps the bought_by/bought_at constraint true. */
export async function setShoppingItemBoughtAction(itemId: string, bought: boolean): Promise<void> {
  const { supabase, userId } = await currentMember();
  if (!userId) redirect("/login");

  await supabase
    .from("shopping_items")
    .update(
      bought
        ? { status: "bought", bought_by: userId, bought_at: new Date().toISOString() }
        : { status: "open", bought_by: null, bought_at: null },
    )
    .eq("id", itemId);

  revalidatePath("/shopping");
}

export async function deleteShoppingItemAction(itemId: string): Promise<void> {
  const { supabase, userId } = await currentMember();
  if (!userId) redirect("/login");

  await supabase.from("shopping_items").delete().eq("id", itemId);
  revalidatePath("/shopping");
}
