/**
 * Turns an expense form submission into an expense plus its shares, using the
 * money engine. Pure, so the client can show a live preview with the same logic
 * the server uses to save.
 *
 * Relative imports only: vitest does not read the "@/..." alias.
 */
import { MoneyError, parseRupeesToPaise, type Paise } from "../money/paise";
import { splitByAmount, splitByBasisPoints, splitEqual, type ShareResult } from "../money/split";

export type ExpenseScope = "personal" | "shared";
export type SplitMethod = "equal" | "amount" | "percent";

export interface ExpenseShareRow {
  userId: string;
  sharePaise: Paise;
  basisPoints: number | null;
}

export interface ParsedExpense {
  scope: ExpenseScope;
  description: string;
  amountPaise: Paise;
  expenseDate: string;
  paidBy: string;
  splitMethod: SplitMethod;
  shares: ExpenseShareRow[];
}

export type ParseResult = { ok: true; expense: ParsedExpense } | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "33.33" -> 3333 basis points. Up to two decimals, 0 to 100 percent. */
export function percentToBasisPoints(text: string): number {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) throw new MoneyError(`not a valid percentage: "${text}"`);
  const basisPoints = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0") || "0");
  if (basisPoints > 10000) throw new MoneyError("a percentage cannot exceed 100");
  return basisPoints;
}

function toRows(results: ShareResult[], basisPoints: Map<string, number> | null): ExpenseShareRow[] {
  return results.map((r) => ({
    userId: r.memberId,
    sharePaise: r.paise,
    basisPoints: basisPoints ? basisPoints.get(r.memberId) ?? null : null,
  }));
}

/**
 * Reads the expense form. `currentUserId` is the signed-in user, who owns personal expenses.
 * Accepts FormData from a browser form or the server action.
 *
 * Field names:
 *   scope        "shared" | "personal"
 *   description  text
 *   amount       rupees, e.g. "1,234.50"
 *   expenseDate  YYYY-MM-DD
 *   paidBy       member id (shared only)
 *   splitMethod  "equal" | "amount" | "percent" (shared only)
 *   participants member id, repeated once per included person (shared only)
 *   exact_<id>   rupees owed by <id> (method "amount")
 *   percent_<id> percent owed by <id> (method "percent")
 */
export function parseExpenseForm(form: FormData, currentUserId: string): ParseResult {
  const get = (name: string) => String(form.get(name) ?? "");
  try {
    const scope = get("scope");
    if (scope !== "personal" && scope !== "shared") return { ok: false, error: "Choose shared or personal." };

    const description = get("description").trim();
    if (description.length < 1 || description.length > 120) {
      return { ok: false, error: "Describe the expense in 1 to 120 characters." };
    }

    const amountPaise = parseRupeesToPaise(get("amount"));
    if (amountPaise <= 0) return { ok: false, error: "Enter an amount above zero." };

    const expenseDate = get("expenseDate");
    if (!DATE_PATTERN.test(expenseDate)) return { ok: false, error: "Pick a valid date." };

    if (scope === "personal") {
      return {
        ok: true,
        expense: {
          scope,
          description,
          amountPaise,
          expenseDate,
          paidBy: currentUserId,
          splitMethod: "equal",
          shares: [{ userId: currentUserId, sharePaise: amountPaise, basisPoints: null }],
        },
      };
    }

    const paidBy = get("paidBy");
    if (!paidBy) return { ok: false, error: "Choose who paid." };

    const splitMethod = get("splitMethod");
    const participants = form.getAll("participants").map(String);
    if (participants.length === 0) return { ok: false, error: "Choose who shares this expense." };

    let shares: ExpenseShareRow[];
    if (splitMethod === "equal") {
      shares = toRows(splitEqual(amountPaise, participants, paidBy), null);
    } else if (splitMethod === "amount") {
      const exact = participants.map((id) => ({
        memberId: id,
        paise: parseRupeesToPaise(get(`exact_${id}`)),
      }));
      shares = toRows(splitByAmount(amountPaise, exact), null);
    } else if (splitMethod === "percent") {
      const bp = new Map<string, number>();
      const entries = participants.map((id) => {
        const basisPoints = percentToBasisPoints(get(`percent_${id}`));
        bp.set(id, basisPoints);
        return { memberId: id, basisPoints };
      });
      shares = toRows(splitByBasisPoints(amountPaise, entries, paidBy), bp);
    } else {
      return { ok: false, error: "Choose how to split it." };
    }

    return {
      ok: true,
      expense: {
        scope,
        description,
        amountPaise,
        expenseDate,
        paidBy,
        splitMethod: splitMethod as SplitMethod,
        shares,
      },
    };
  } catch (error) {
    if (error instanceof MoneyError) return { ok: false, error: error.message };
    throw error;
  }
}
