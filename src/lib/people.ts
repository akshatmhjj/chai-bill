/**
 * Human wording for a list of people. Pure, relative imports only.
 */

/** "Priya", "Priya and Arjun", "Priya, Arjun and 2 more". Keeps headings short in big flats. */
export function namesList(names: string[], shown = 2): string {
  if (names.length === 0) return "";
  if (names.length <= shown + 1) {
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
}

/** The flat's size as a short label: "Just you", "2 people", "6 people". */
export function flatSizeLabel(count: number): string {
  if (count <= 1) return "Just you";
  return `${count} people`;
}

/** The most people in one flat. Must match public.household_member_cap() in the database. */
export const FLAT_SIZE_CAP = 15;
