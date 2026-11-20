import { describe, expect, it } from "vitest";
import { describeActivity, type ActivityRow } from "./describe";

const ME = "11111111-1111-1111-1111-111111111111";
const YASH = "22222222-2222-2222-2222-222222222222";
const names = (id: string) => (id === YASH ? "Yashwardhan" : "Someone");

function row(kind: string, actor: string, payload: Record<string, unknown>): ActivityRow {
  return { kind, actor_id: actor, payload, created_at: "2026-11-20T10:00:00Z" };
}

describe("describeActivity", () => {
  it("describes an expense added by me and by my roommate", () => {
    const r = { description: "Groceries", amount_paise: 100000 };
    expect(describeActivity(row("expense_added", ME, r), names, ME)).toBe('You added "Groceries" ₹1,000.00');
    expect(describeActivity(row("expense_added", YASH, r), names, ME)).toBe('Yashwardhan added "Groceries" ₹1,000.00');
  });

  it("describes a deleted expense", () => {
    expect(describeActivity(row("expense_deleted", YASH, { description: "Milk" }), names, ME)).toBe(
      'Yashwardhan deleted "Milk"',
    );
  });

  it("names the payee, using 'you' when the payee is me", () => {
    const toMe = { from_user: YASH, to_user: ME, amount_paise: 20000, method: "upi" };
    expect(describeActivity(row("settlement_recorded", YASH, toMe), names, ME)).toBe("Yashwardhan paid you ₹200.00");

    const toYash = { from_user: ME, to_user: YASH, amount_paise: 20000, method: "upi" };
    expect(describeActivity(row("settlement_recorded", ME, toYash), names, ME)).toBe("You paid Yashwardhan ₹200.00");
  });

  it("describes a deleted payment with its amount", () => {
    expect(describeActivity(row("settlement_deleted", ME, { amount_paise: 50000 }), names, ME)).toBe(
      "You deleted a payment of ₹500.00",
    );
  });

  it("describes shopping list changes", () => {
    expect(describeActivity(row("shopping_added", ME, { name: "Milk" }), names, ME)).toBe('You added "Milk" to the shopping list');
    expect(describeActivity(row("shopping_bought", YASH, { name: "Milk" }), names, ME)).toBe('Yashwardhan bought "Milk"');
    expect(describeActivity(row("shopping_reopened", YASH, { name: "Milk" }), names, ME)).toBe(
      'Yashwardhan put "Milk" back on the list',
    );
  });

  it("falls back for an unknown kind instead of throwing", () => {
    expect(describeActivity(row("something_new", YASH, {}), names, ME)).toBe("Yashwardhan made a change");
  });
});
