import { z } from "zod";
import { AVATAR_KEYS } from "../avatars";

/** Invite codes are 32 lowercase hex characters (see household_invites in the migration). */
export const INVITE_CODE_PATTERN = /^[0-9a-f]{32}$/;

const personName = z.string().trim().min(1, "Enter your name").max(40, "Keep your name under 40 characters");

/** The first onboarding step, and the profile editor. */
export const profileSchema = z.object({
  name: personName,
  avatar: z.enum(AVATAR_KEYS, { message: "Pick an avatar" }),
});

export const flatNameSchema = z.object({
  name: z.string().trim().min(1, "Give the flat a name").max(60, "Keep the name under 60 characters"),
});

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    // People paste codes with stray spaces or dashes; ignore them.
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(INVITE_CODE_PATTERN, "That invite code doesn't look right")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type FlatNameInput = z.infer<typeof flatNameSchema>;
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
