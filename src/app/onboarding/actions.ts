"use server";

import { revalidatePath } from "next/cache";
import { fail, type ActionResult } from "@/lib/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/household";

/** Saves the name and avatar. Used by onboarding and by the profile editor. */
export async function saveProfileAction(input: { name: string; avatar: string }): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_profile", { p_display_name: parsed.data.name, p_avatar_key: parsed.data.avatar });
  if (error) return fail("Something went wrong. Please try again.");

  revalidatePath("/", "layout");
  return { ok: true };
}
