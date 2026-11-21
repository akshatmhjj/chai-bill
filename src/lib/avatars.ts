/**
 * The ten avatars. Each is a small character with the same face system, so the set reads as one family.
 * The art lives in components/avatar; this file is the data both server and client code share,
 * including the palette that gives each person a subtle personal accent.
 */
export const AVATAR_KEYS = ["chai", "mango", "samosa", "plant", "moon", "sun", "cloud", "cat", "fox", "panda"] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export const DEFAULT_AVATAR: AvatarKey = "chai";

interface Palette {
  /** Solid accent, soft tint, and readable ink on the tint. */
  me: string;
  soft: string;
  ink: string;
}

export interface AvatarMeta {
  key: AvatarKey;
  name: string;
  blurb: string;
  /** Badge colour behind the character. */
  bg: { light: string; dark: string };
  personal: { light: Palette; dark: Palette };
}

export const AVATARS: Record<AvatarKey, AvatarMeta> = {
  chai: {
    key: "chai",
    name: "Chai",
    blurb: "Warm and steady",
    bg: { light: "#fbe3cc", dark: "#3e2819" },
    personal: {
      light: { me: "#c9733f", soft: "#fbe6d4", ink: "#8a4220" },
      dark: { me: "#e0925f", soft: "#3a2518", ink: "#f4c29e" },
    },
  },
  mango: {
    key: "mango",
    name: "Mango",
    blurb: "Sweet, in season",
    bg: { light: "#fff1b8", dark: "#3f3414" },
    personal: {
      light: { me: "#e8a010", soft: "#fff0c2", ink: "#7a5200" },
      dark: { me: "#f5bb3b", soft: "#3a2f12", ink: "#f7d98a" },
    },
  },
  samosa: {
    key: "samosa",
    name: "Samosa",
    blurb: "Crispy at the corners",
    bg: { light: "#f7e6c9", dark: "#3b2e1a" },
    personal: {
      light: { me: "#d19a3f", soft: "#f8ebcf", ink: "#7a5416" },
      dark: { me: "#e5b565", soft: "#392d17", ink: "#f2d49d" },
    },
  },
  plant: {
    key: "plant",
    name: "Monstera",
    blurb: "Quietly growing",
    bg: { light: "#dcefd9", dark: "#1f3624" },
    personal: {
      light: { me: "#4e9a5b", soft: "#ddf0dd", ink: "#285a32" },
      dark: { me: "#6dbb7b", soft: "#1b3322", ink: "#a7ddb0" },
    },
  },
  moon: {
    key: "moon",
    name: "Moon",
    blurb: "Night owl",
    bg: { light: "#d8daf7", dark: "#29294d" },
    personal: {
      light: { me: "#6f72d8", soft: "#e3e4fa", ink: "#3a3c9a" },
      dark: { me: "#9396f0", soft: "#25264a", ink: "#c6c8fa" },
    },
  },
  sun: {
    key: "sun",
    name: "Sunny",
    blurb: "Up before the alarm",
    bg: { light: "#ffe0c7", dark: "#402a19" },
    personal: {
      light: { me: "#f08a24", soft: "#ffe6cc", ink: "#8a4608" },
      dark: { me: "#f6a24e", soft: "#3d2814", ink: "#f9cda0" },
    },
  },
  cloud: {
    key: "cloud",
    name: "Cloud",
    blurb: "Head in the clouds",
    bg: { light: "#d6eaf8", dark: "#1e3347" },
    personal: {
      light: { me: "#4f9ad6", soft: "#dcebf8", ink: "#1f5a8a" },
      dark: { me: "#7bb6e8", soft: "#1c3044", ink: "#b4d6f2" },
    },
  },
  cat: {
    key: "cat",
    name: "Cat",
    blurb: "Does what it likes",
    bg: { light: "#e4d9f2", dark: "#2f2745" },
    personal: {
      light: { me: "#8e7ab5", soft: "#e9e1f5", ink: "#4f3d78" },
      dark: { me: "#b09bd6", soft: "#2c2540", ink: "#d4c7ec" },
    },
  },
  fox: {
    key: "fox",
    name: "Fox",
    blurb: "Sharp with the budget",
    bg: { light: "#ffdcc8", dark: "#3f2418" },
    personal: {
      light: { me: "#e2682a", soft: "#fde2d3", ink: "#8f3a10" },
      dark: { me: "#f2865a", soft: "#3c2218", ink: "#f8bc9f" },
    },
  },
  panda: {
    key: "panda",
    name: "Panda",
    blurb: "Snack-driven",
    bg: { light: "#e2e8e4", dark: "#3d4d45" },
    personal: {
      light: { me: "#5e7068", soft: "#e2eae6", ink: "#34433c" },
      dark: { me: "#8ca39a", soft: "#212c27", ink: "#bfd0c8" },
    },
  },
};

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && (AVATAR_KEYS as readonly string[]).includes(value);
}

/** Falls back to the default for missing or unknown keys, so a bad row never breaks a screen. */
export function avatarOrDefault(value: unknown): AvatarKey {
  return isAvatarKey(value) ? value : DEFAULT_AVATAR;
}

/**
 * CSS variables that give a person their subtle accent. The `.personal` class in globals.css
 * picks the light or dark set, so one inline style works in both themes.
 */
export function personalStyle(key: AvatarKey): Record<string, string> {
  const { light, dark } = AVATARS[key].personal;
  return {
    "--pl-me": light.me,
    "--pl-soft": light.soft,
    "--pl-ink": light.ink,
    "--pd-me": dark.me,
    "--pd-soft": dark.soft,
    "--pd-ink": dark.ink,
  };
}
