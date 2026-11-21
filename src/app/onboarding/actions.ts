"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { FLAT_SIZE_CAP } from "@/lib/people";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { flatNameSchema, inviteCodeSchema, profileSchema } from "@/lib/validation/household";

/** Turns an RPC error into something a person can act on. */
function friendly(message: string): string {
  if (message.includes("household is full")) return `This flat is full. It holds up to ${FLAT_SIZE_CAP} people.`;
  if (message.includes("invite is invalid or expired")) return "That invite code is invalid, already used, or expired.";
  if (message.includes("not authenticated")) return "Your session has expired. Please sign in again.";
  return "Something went wrong. Please try again.";
}

/** Saves the name and avatar. Also used to edit them later from the profile. */
export async function saveProfileAction(input: { name: string; avatar: string }): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_profile", { p_display_name: parsed.data.name, p_avatar_key: parsed.data.avatar });
  if (error) return fail(friendly(error.message));

  revalidatePath("/", "layout");
  return { ok: true };
}

async function profileName(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("display_name").eq("user_id", auth.user.id).maybeSingle();
  return (data?.display_name as string | undefined) ?? null;
}

/** Creates the flat and an invite for the first flatmate. Returns the code to share. */
export async function createFlatAction(input: { name: string }): Promise<ActionResult<{ code: string }>> {
  const parsed = flatNameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const name = await profileName();
  if (!name) return fail("Set up your profile first.");

  const supabase = await createSupabaseServerClient();
  const { data: householdId, error } = await supabase.rpc("create_household", { p_name: parsed.data.name, p_display_name: name });
  if (error || typeof householdId !== "string") return fail(friendly(error?.message ?? ""));

  const { data: code, error: inviteError } = await supabase.rpc("create_household_invite", { p_household: householdId });
  if (inviteError || typeof code !== "string") return fail(friendly(inviteError?.message ?? ""));

  revalidatePath("/", "layout");
  return { ok: true, code };
}

export async function joinFlatAction(input: { code: string }): Promise<ActionResult> {
  const parsed = inviteCodeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const name = await profileName();
  if (!name) return fail("Set up your profile first.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("join_household", { p_code: parsed.data.code, p_display_name: name });
  if (error) return fail(friendly(error.message));

  revalidatePath("/", "layout");
  return { ok: true };
}

/** A fresh single-use invite, for when the first code has been lost or has expired. */
export async function createInviteAction(input: { householdId: string }): Promise<ActionResult<{ code: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data: code, error } = await supabase.rpc("create_household_invite", { p_household: input.householdId });
  if (error || typeof code !== "string") return fail(friendly(error?.message ?? ""));
  return { ok: true, code };
}
