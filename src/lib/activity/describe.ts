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
    case "expense_edited":
      return `${actor} edited "${text("description")}" ${amount}`;
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

/** A structured version of an event, so the feed can style names and amounts instead of printing one string. */
export interface ActivityParts {
  actor: string;
  verb: string;
  /** The thing acted on, shown emphasised: an expense, an item, or the person paid. */
  subject?: string;
  amountPaise?: number;
  /** A short note, shown after a dot: "paid by Yashwardhan", "UPI". */
  extra?: string;
  /** The rest of the sentence, shown plainly: "to the shopping list". */
  tail?: string;
}

export function describeActivityParts(row: ActivityRow, nameOf: (id: string) => string, me: string): ActivityParts {
  const actor = row.actor_id === me ? "You" : nameOf(row.actor_id);
  const inline = (id: string) => (id === me ? "you" : nameOf(id));
  const p = row.payload;
  const amountPaise = typeof p.amount_paise === "number" ? p.amount_paise : undefined;
  const text = (key: string) => (typeof p[key] === "string" ? (p[key] as string) : undefined);

  switch (row.kind) {
    case "expense_added":
    case "expense_edited": {
      const paidBy = text("paid_by");
      return {
        actor,
        verb: row.kind === "expense_added" ? "added" : "edited",
        subject: text("description"),
        amountPaise,
        // Only worth saying when the payer is someone other than who added it.
        extra: paidBy && paidBy !== row.actor_id ? `paid by ${inline(paidBy)}` : undefined,
      };
    }
    case "expense_deleted":
      return { actor, verb: "deleted", subject: text("description"), amountPaise };
    case "settlement_recorded":
      return { actor, verb: "paid", subject: text("to_user") ? inline(text("to_user") as string) : "someone", amountPaise, extra: text("method")?.toUpperCase() };
    case "settlement_deleted":
      return { actor, verb: "deleted a payment of", amountPaise };
    case "shopping_added":
      return { actor, verb: "added", subject: text("name"), tail: "to the shopping list" };
    case "shopping_bought":
      return { actor, verb: "bought", subject: text("name") };
    case "shopping_reopened":
      return { actor, verb: "put back", subject: text("name"), tail: "on the list" };
    case "shopping_deleted":
      return { actor, verb: "removed", subject: text("name"), tail: "from the list" };
    default:
      return { actor, verb: "made a change" };
  }
}
