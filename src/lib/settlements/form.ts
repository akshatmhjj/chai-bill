/**
 * Settlement form parser: "I paid <person> <amount> by <method>".
 * Pure, so it can be tested without a database. Relative imports only.
 */
import { parseRupeesToPaise, MoneyError, type Paise } from "../money/paise";

export type SettlementMethod = "upi" | "cash" | "other";

export interface ParsedSettlement {
  toUserId: string;
  amountPaise: Paise;
  method: SettlementMethod;
  reference: string | null;
  note: string | null;
  settledOn: string;
}

export type SettlementParseResult = { ok: true; settlement: ParsedSettlement } | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const METHODS: SettlementMethod[] = ["upi", "cash", "other"];

/**
 * Reads the settlement form. The payer is always the signed-in user; `toUserId` must be
 * another member of the household.
 *
 * Field names: to, amount (rupees), method, reference (optional, e.g. UPI transaction id),
 * note (optional), settledOn (YYYY-MM-DD).
 */
export function parseSettlementForm(form: FormData, currentUserId: string, memberIds: string[]): SettlementParseResult {
  const get = (name: string) => String(form.get(name) ?? "").trim();
  try {
    const toUserId = get("to");
    if (!memberIds.includes(toUserId)) return { ok: false, error: "Choose who you paid." };
    if (toUserId === currentUserId) return { ok: false, error: "You can't pay yourself." };

    const amountPaise = parseRupeesToPaise(get("amount"));
    if (amountPaise <= 0) return { ok: false, error: "Enter an amount above zero." };

    const method = get("method") as SettlementMethod;
    if (!METHODS.includes(method)) return { ok: false, error: "Choose how you paid." };

    const reference = get("reference");
    if (reference.length > 80) return { ok: false, error: "The reference must be 80 characters or fewer." };

    const note = get("note");
    if (note.length > 280) return { ok: false, error: "The note must be 280 characters or fewer." };

    const settledOn = get("settledOn");
    if (!DATE_PATTERN.test(settledOn)) return { ok: false, error: "Pick a valid date." };

    return {
      ok: true,
      settlement: {
        toUserId,
        amountPaise,
        method,
        reference: reference || null,
        note: note || null,
        settledOn,
      },
    };
  } catch (error) {
    if (error instanceof MoneyError) return { ok: false, error: error.message };
    throw error;
  }
}
