import { describe, expect, it } from "vitest";
import { parseExpenseForm, percentToBasisPoints } from "./form";

const ME = "11111111-1111-1111-1111-111111111111";
const YASH = "22222222-2222-2222-2222-222222222222";

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((v) => f.append(key, v));
    else f.set(key, value);
  }
  return f;
}

const base = {
  scope: "shared",
  description: "Groceries",
  amount: "1000",
  expenseDate: "2026-11-20",
  paidBy: ME,
  participants: [ME, YASH],
};

describe("percentToBasisPoints", () => {
  it.each([
    ["0", 0],
    ["50", 5000],
    ["33.33", 3333],
    ["33.3", 3330],
    ["100", 10000],
  ])("%s%% is %i basis points", (input, expected) => {
    expect(percentToBasisPoints(input)).toBe(expected);
  });

  it.each(["", "abc", "100.5", "-5", "33.333", "101"])("rejects %s", (input) => {
    expect(() => percentToBasisPoints(input)).toThrow();
  });
});

describe("parseExpenseForm", () => {
  it("splits a shared expense equally and gives the leftover paisa to the payer", () => {
    // 101 paise between two people: 50 each, with the odd paisa to the payer.
    const result = parseExpenseForm(form({ ...base, amount: "1.01", splitMethod: "equal" }), ME);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expense.shares).toEqual([
      { userId: ME, sharePaise: 51, basisPoints: null },
      { userId: YASH, sharePaise: 50, basisPoints: null },
    ]);
  });

  it("uses exact amounts when they sum to the total", () => {
    const result = parseExpenseForm(
      form({ ...base, splitMethod: "amount", [`exact_${ME}`]: "700", [`exact_${YASH}`]: "300" }),
      ME,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expense.shares.map((s) => s.sharePaise)).toEqual([70000, 30000]);
  });

  it("reports exact amounts that do not add up", () => {
    const result = parseExpenseForm(
      form({ ...base, splitMethod: "amount", [`exact_${ME}`]: "700", [`exact_${YASH}`]: "200" }),
      ME,
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/sum to 90000/) });
  });

  it("splits by percentage, with the remainder to the payer, and records basis points", () => {
    const result = parseExpenseForm(
      form({ ...base, amount: "1.00", splitMethod: "percent", [`percent_${ME}`]: "33.34", [`percent_${YASH}`]: "66.66" }),
      ME,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const total = result.expense.shares.reduce((a, s) => a + s.sharePaise, 0);
    expect(total).toBe(100);
    expect(result.expense.shares.map((s) => s.basisPoints)).toEqual([3334, 6666]);
  });

  it("reports percentages that do not total 100", () => {
    const result = parseExpenseForm(
      form({ ...base, splitMethod: "percent", [`percent_${ME}`]: "50", [`percent_${YASH}`]: "40" }),
      ME,
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/sum to 9000/) });
  });

  it("requires the payer to be one of the participants for equal splits", () => {
    const result = parseExpenseForm(form({ ...base, participants: [YASH], splitMethod: "equal" }), ME);
    expect(result).toEqual({
      ok: false,
      error: "payer must be one of the participants for this split method",
    });
  });

  it("makes a personal expense a single share owned by the current user, ignoring split fields", () => {
    const result = parseExpenseForm(
      form({ scope: "personal", description: "Gift", amount: "300", expenseDate: "2026-11-20", paidBy: YASH, splitMethod: "amount" }),
      ME,
    );
    expect(result).toEqual({
      ok: true,
      expense: {
        scope: "personal",
        description: "Gift",
        amountPaise: 30000,
        expenseDate: "2026-11-20",
        paidBy: ME,
        splitMethod: "equal",
        shares: [{ userId: ME, sharePaise: 30000, basisPoints: null }],
      },
    });
  });

  it.each([
    [{ amount: "0" }, /above zero/],
    [{ amount: "12.345" }, /not a valid rupee amount/],
    [{ description: "   " }, /1 to 120/],
    [{ expenseDate: "20-11-2026" }, /valid date/],
    [{ scope: "household" }, /shared or personal/],
    [{ participants: [] }, /shares this expense/],
    [{ splitMethod: "random" }, /how to split/],
  ])("rejects bad input %j", (override, pattern) => {
    const fields: Record<string, string | string[]> = { ...base, splitMethod: "equal", ...override } as never;
    const result = parseExpenseForm(form(fields), ME);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(pattern);
  });
});
