import { describe, expect, it } from "vitest";
import {
  createHouseholdSchema,
  joinHouseholdSchema,
  loginSchema,
} from "./household";

describe("createHouseholdSchema", () => {
  it("trims names and accepts valid input", () => {
    const parsed = createHouseholdSchema.parse({ householdName: "  4B  ", displayName: " Akshat " });
    expect(parsed).toEqual({ householdName: "4B", displayName: "Akshat" });
  });

  it("rejects blank and overlong names", () => {
    expect(createHouseholdSchema.safeParse({ householdName: "   ", displayName: "A" }).success).toBe(false);
    expect(createHouseholdSchema.safeParse({ householdName: "x".repeat(61), displayName: "A" }).success).toBe(false);
    expect(createHouseholdSchema.safeParse({ householdName: "Flat", displayName: "" }).success).toBe(false);
    expect(createHouseholdSchema.safeParse({ householdName: "Flat", displayName: "x".repeat(41) }).success).toBe(false);
  });
});

describe("joinHouseholdSchema", () => {
  const code = "0123456789abcdef0123456789abcdef";

  it("accepts a 32-character hex code and normalises case and spaces", () => {
    const parsed = joinHouseholdSchema.parse({ code: `  ${code.toUpperCase()} `, displayName: "Yash" });
    expect(parsed.code).toBe(code);
  });

  it("rejects codes of the wrong length or alphabet", () => {
    expect(joinHouseholdSchema.safeParse({ code: "abc", displayName: "Yash" }).success).toBe(false);
    expect(joinHouseholdSchema.safeParse({ code: "z".repeat(32), displayName: "Yash" }).success).toBe(false);
    expect(joinHouseholdSchema.safeParse({ code: code + "0", displayName: "Yash" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normalises the email and rejects invalid addresses", () => {
    expect(loginSchema.parse({ email: " Akshat@Example.COM " }).email).toBe("akshat@example.com");
    expect(loginSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
