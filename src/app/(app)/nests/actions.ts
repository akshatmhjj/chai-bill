"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { getPersonContext } from "@/lib/data/context";
import { nestAccess } from "@/lib/nests/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const nestNameSchema = z.object({
  name: z.string().trim().min(1, "Give your nest a name").max(60, "Keep the name under 60 characters"),
});

/** Turns an RPC error into words a person can act on. */
function friendly(message: string): string {
  if (message.includes("household is full")) return "This nest is full. It holds up to 15 people.";
  if (message.includes("invite is invalid or expired")) return "That code doesn't work any more. Ask for a fresh one.";
  if (message.includes("not authenticated")) return "Your session has expired. Please sign in again.";
  return "Something went wrong. Please try again.";
}

/** Creates a nest for the signed-in person. Returns its id so the app can open it. */
export async function createNestAction(input: { name: string }): Promise<ActionResult<{ id: string }>> {
  const parsed = nestNameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const person = await getPersonContext();
  if (!person || person === "no-profile") return fail("Set up your profile first.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_household", { p_name: parsed.data.name, p_display_name: person.profile.name });
  if (error || typeof data !== "string") return fail(friendly(error?.message ?? ""));

  revalidatePath("/", "layout");
  return { ok: true, id: data };
}

/** Joins a nest with a code (typed, pasted, or from a link). Returns the nest's id. */
export async function joinNestAction(input: { code: string }): Promise<ActionResult<{ id: string }>> {
  const person = await getPersonContext();
  if (!person || person === "no-profile") return fail("Set up your profile first.");

  const code = (input.code ?? "").trim();
  if (code.replace(/[^a-zA-Z0-9]/g, "").length < 8) return fail("That code is too short. Check it and try again.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_household", { p_code: code, p_display_name: person.profile.name });
  if (error || typeof data !== "string") return fail(friendly(error?.message ?? ""));

  revalidatePath("/", "layout");
  return { ok: true, id: data };
}

/** Makes a fresh code for a nest. The old one stops working straight away. */
export async function refreshInviteAction(nestId: string): Promise<ActionResult<{ code: string }>> {
  const access = await nestAccess(nestId);
  if (!access.ok) return fail(access.error);

  const { data, error } = await access.supabase.rpc("create_household_invite", { p_household: nestId });
  if (error || typeof data !== "string") return fail(friendly(error?.message ?? ""));
  return { ok: true, code: data };
}
