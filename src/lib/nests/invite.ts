/** Shared invite helpers. Pure, so client and server agree on the link and the code format. */

/** The cookie that remembers where to go after sign-in (e.g. a join link). */
export const CODE_COOKIE = "chai-next";

/** Codes are 8 characters, shown as two groups of 4: "k7qx-m9tn". */
export function formatInviteCode(code: string): string {
  const clean = code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

/** The link to share, given the site's origin. */
export function joinLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/join/${code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
}

/** Only same-site, relative paths may be used after sign-in. Blocks open redirects. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
