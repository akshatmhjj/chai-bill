import { describe, expect, it } from "vitest";
import { flatNameSchema, inviteCodeSchema, loginSchema, profileSchema } from "./household";

describe("profileSchema", () => {
  it("trims the name and accepts a valid avatar", () => {
    expect(profileSchema.parse({ name: "  Akshat ", avatar: "fox" })).toEqual({ name: "Akshat", avatar: "fox" });
  });

  it("rejects a blank name, a long name and an unknown avatar", () => {
    expect(profileSchema.safeParse({ name: "   ", avatar: "fox" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "x".repeat(41), avatar: "fox" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "Akshat", avatar: "dragon" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "Akshat" }).success).toBe(false);
  });
});

describe("flatNameSchema", () => {
  it("trims and bounds the name", () => {
    expect(flatNameSchema.parse({ name: "  4B  " })).toEqual({ name: "4B" });
    expect(flatNameSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(flatNameSchema.safeParse({ name: "x".repeat(61) }).success).toBe(false);
  });
});

describe("inviteCodeSchema", () => {
  const code = "0123456789abcdef0123456789abcdef";

  it("accepts a 32-character hex code and normalises case, spaces and dashes", () => {
    expect(inviteCodeSchema.parse({ code: `  ${code.toUpperCase()} ` }).code).toBe(code);
    expect(inviteCodeSchema.parse({ code: "01234567 89abcdef-01234567-89abcdef" }).code).toBe(code);
  });

  it("rejects codes of the wrong length or alphabet", () => {
    expect(inviteCodeSchema.safeParse({ code: "abc" }).success).toBe(false);
    expect(inviteCodeSchema.safeParse({ code: "z".repeat(32) }).success).toBe(false);
    expect(inviteCodeSchema.safeParse({ code: code + "0" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normalises the email and rejects invalid addresses", () => {
    expect(loginSchema.parse({ email: " Akshat@Example.COM " }).email).toBe("akshat@example.com");
    expect(loginSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
