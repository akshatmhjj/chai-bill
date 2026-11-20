"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createHouseholdSchema,
  joinHouseholdSchema,
} from "@/lib/validation/household";

export type ActionState = { error?: string; code?: string } | null;

/** Turns a Postgres/RPC error message into something a roommate can act on. */
function friendlyError(message: string): string {
  if (message.includes("household is full")) return "This flat already has two members.";
  if (message.includes("invite is invalid or expired")) return "That invite code is invalid, used, or expired.";
  if (message.includes("not authenticated")) return "Your session has expired. Sign in again.";
  return "Something went wrong. Please try again.";
}

export async function createHouseholdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createHouseholdSchema.safeParse({
    householdName: formData.get("householdName"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: parsed.data.householdName,
    p_display_name: parsed.data.displayName,
  });
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/household");
  redirect("/household");
}

export async function joinHouseholdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = joinHouseholdSchema.safeParse({
    code: formData.get("code"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("join_household", {
    p_code: parsed.data.code,
    p_display_name: parsed.data.displayName,
  });
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/household");
  redirect("/household");
}

export async function createInviteAction(householdId: string): Promise<ActionState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_household_invite", { p_household: householdId });
  if (error || typeof data !== "string") return { error: friendlyError(error?.message ?? "") };
  return { code: data };
}
