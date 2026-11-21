import { describe, expect, it } from "vitest";
import { AVATAR_KEYS, AVATARS, avatarOrDefault, isAvatarKey, personalStyle } from "./avatars";

describe("avatars", () => {
  it("has exactly ten avatars, each with complete data", () => {
    expect(AVATAR_KEYS).toHaveLength(10);
    for (const key of AVATAR_KEYS) {
      const meta = AVATARS[key];
      expect(meta.key).toBe(key);
      expect(meta.name.length).toBeGreaterThan(0);
      for (const hex of [meta.bg.light, meta.bg.dark, meta.personal.light.me, meta.personal.dark.soft]) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("recognises valid keys and falls back for anything else", () => {
    expect(isAvatarKey("fox")).toBe(true);
    expect(isAvatarKey("dragon")).toBe(false);
    expect(isAvatarKey(null)).toBe(false);
    expect(avatarOrDefault("panda")).toBe("panda");
    expect(avatarOrDefault("nope")).toBe("chai");
    expect(avatarOrDefault(undefined)).toBe("chai");
  });

  it("gives each avatar a distinct personal accent", () => {
    const accents = new Set(AVATAR_KEYS.map((k) => personalStyle(k)["--pl-me"]));
    expect(accents.size).toBe(10);
  });
});
