import { z } from "zod";

/** Invite codes are 32 lowercase hex characters (see household_invites in the migration). */
export const INVITE_CODE_PATTERN = /^[0-9a-f]{32}$/;

export const createHouseholdSchema = z.object({
  householdName: z.string().trim().min(1, "Give the flat a name").max(60, "Keep the name under 60 characters"),
  displayName: z.string().trim().min(1, "Enter your name").max(40, "Keep your name under 40 characters"),
});

export const joinHouseholdSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(INVITE_CODE_PATTERN, "That invite code doesn't look right"),
  displayName: z.string().trim().min(1, "Enter your name").max(40, "Keep your name under 40 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
