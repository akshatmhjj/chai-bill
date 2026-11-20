import { describe, expect, it } from "vitest";
import { parseSettlementForm } from "./form";

const ME = "11111111-1111-1111-1111-111111111111";
const YASH = "22222222-2222-2222-2222-222222222222";

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const good = { to: YASH, amount: "200", method: "upi", reference: "UPI123", note: "", settledOn: "2026-11-20" };

describe("parseSettlementForm", () => {
  it("accepts a partial UPI payment to another member", () => {
    const r = parseSettlementForm(form(good), ME, [ME, YASH]);
    expect(r).toEqual({
      ok: true,
      settlement: { toUserId: YASH, amountPaise: 20000, method: "upi", reference: "UPI123", note: null, settledOn: "2026-11-20" },
    });
  });

  it("treats blank optional fields as null", () => {
    const r = parseSettlementForm(form({ ...good, method: "cash", reference: "  " }), ME, [ME, YASH]);
    expect(r.ok && r.settlement.reference).toBeNull();
  });

  it("rejects paying yourself or someone outside the household", () => {
    expect(parseSettlementForm(form({ ...good, to: ME }), ME, [ME, YASH])).toEqual({
      ok: false,
      error: "You can't pay yourself.",
    });
    expect(parseSettlementForm(form({ ...good, to: "99999999-9999-9999-9999-999999999999" }), ME, [ME, YASH]).ok).toBe(false);
  });

  it.each([
    [{ amount: "0" }, /above zero/],
    [{ amount: "abc" }, /not a valid rupee amount/],
    [{ method: "cheque" }, /how you paid/],
    [{ reference: "x".repeat(81) }, /80 characters/],
    [{ note: "x".repeat(281) }, /280 characters/],
    [{ settledOn: "yesterday" }, /valid date/],
  ])("rejects bad input %j", (override, pattern) => {
    const r = parseSettlementForm(form({ ...good, ...override }), ME, [ME, YASH]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(pattern);
  });
});
