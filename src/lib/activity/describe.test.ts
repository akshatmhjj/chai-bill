import { describe, expect, it } from "vitest";
import { describeActivity, describeActivityParts, type ActivityRow } from "./describe";

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

  it("describes an edited expense", () => {
    expect(describeActivity(row("expense_edited", YASH, { description: "Groceries", amount_paise: 120000 }), names, ME)).toBe(
      'Yashwardhan edited "Groceries" ₹1,200.00',
    );
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

describe("describeActivityParts", () => {
  it("splits an expense into actor, verb, subject and amount, and notes a different payer", () => {
    const parts = describeActivityParts(
      row("expense_added", ME, { description: "Groceries", amount_paise: 100000, paid_by: YASH }),
      names,
      ME,
    );
    expect(parts).toEqual({ actor: "You", verb: "added", subject: "Groceries", amountPaise: 100000, extra: "paid by Yashwardhan" });
  });

  it("leaves out the payer when the person who added it also paid", () => {
    const parts = describeActivityParts(row("expense_added", YASH, { description: "Milk", amount_paise: 5000, paid_by: YASH }), names, ME);
    expect(parts.extra).toBeUndefined();
    expect(parts.actor).toBe("Yashwardhan");
  });

  it("names a payment's recipient and method", () => {
    const parts = describeActivityParts(row("settlement_recorded", YASH, { to_user: ME, amount_paise: 20000, method: "upi" }), names, ME);
    expect(parts).toEqual({ actor: "Yashwardhan", verb: "paid", subject: "you", amountPaise: 20000, extra: "UPI" });
  });

  it("covers the shopping events and unknown kinds", () => {
    expect(describeActivityParts(row("shopping_bought", ME, { name: "Milk" }), names, ME)).toEqual({ actor: "You", verb: "bought", subject: "Milk" });
    expect(describeActivityParts(row("shopping_deleted", YASH, { name: "Eggs" }), names, ME).tail).toBe("from the list");
    expect(describeActivityParts(row("shopping_added", ME, { name: "Milk" }), names, ME)).toEqual({ actor: "You", verb: "added", subject: "Milk", tail: "to the shopping list" });
    expect(describeActivityParts(row("nope", YASH, {}), names, ME)).toEqual({ actor: "Yashwardhan", verb: "made a change" });
  });
});
