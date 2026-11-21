/**
 * Turns an activity_events row into a sentence for the feed. Pure, so it can be tested
 * without a database. Relative imports only.
 */
import { formatINR } from "../money/paise";

export interface ActivityRow {
  kind: string;
  actor_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * `nameOf` gives a display name for a user id. `me` is the signed-in user; their actions read
 * "You ...", and "you" is used mid-sentence.
 */
export function describeActivity(row: ActivityRow, nameOf: (id: string) => string, me: string): string {
  const actor = row.actor_id === me ? "You" : nameOf(row.actor_id);
  const inline = (id: string) => (id === me ? "you" : nameOf(id));
  const p = row.payload;
  const amount = typeof p.amount_paise === "number" ? formatINR(p.amount_paise) : "";
  const text = (key: string) => (typeof p[key] === "string" ? (p[key] as string) : "");

  switch (row.kind) {
    case "expense_added":
      return `${actor} added "${text("description")}" ${amount}`;
    case "expense_deleted":
      return `${actor} deleted "${text("description")}"`;
    case "settlement_recorded": {
      const to = typeof p.to_user === "string" ? inline(p.to_user) : "someone";
      return `${actor} paid ${to} ${amount}`;
    }
    case "settlement_deleted":
      return `${actor} deleted a payment of ${amount}`;
    case "shopping_added":
      return `${actor} added "${text("name")}" to the shopping list`;
    case "shopping_bought":
      return `${actor} bought "${text("name")}"`;
    case "shopping_reopened":
      return `${actor} put "${text("name")}" back on the list`;
    case "shopping_deleted":
      return `${actor} removed "${text("name")}" from the shopping list`;
    default:
      return `${actor} made a change`;
  }
}
