import { describe, expect, it } from "vitest";
import { computeBalances, settleUp, type ExpenseRecord, type SettlementRecord } from "./balances";
import { MoneyError } from "./paise";
import { splitEqual } from "./split";

const expense = (
  id: string,
  payerId: string,
  totalPaise: number,
  participants: string[],
): ExpenseRecord => ({
  id,
  payerId,
  totalPaise,
  shares: splitEqual(totalPaise, participants, payerId),
});

const settlement = (id: string, fromId: string, toId: string, paise: number): SettlementRecord => ({
  id,
  fromId,
  toId,
  paise,
});

const sumValues = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe("computeBalances", () => {
  it("returns zero for everyone with no rows", () => {
    expect(computeBalances(["a", "b"], [], [])).toEqual({ a: 0, b: 0 });
  });

  it("credits the payer and debits each share holder", () => {
    // a pays 1000 split equally with b: b owes a 500.
    const net = computeBalances(["a", "b"], [expense("e1", "a", 1000, ["a", "b"])], []);
    expect(net).toEqual({ a: 500, b: -500 });
  });

  it("nets out a full settlement to zero", () => {
    const net = computeBalances(
      ["a", "b"],
      [expense("e1", "a", 1000, ["a", "b"])],
      [settlement("s1", "b", "a", 500)],
    );
    expect(net).toEqual({ a: 0, b: 0 });
  });

  it("supports partial settlements across several payments", () => {
    const net = computeBalances(
      ["a", "b"],
      [expense("e1", "a", 1000, ["a", "b"])],
      [settlement("s1", "b", "a", 200), settlement("s2", "b", "a", 100)],
    );
    expect(net).toEqual({ a: 200, b: -200 });
  });

  it("flips the sign on overpayment rather than rejecting it", () => {
    const net = computeBalances(
      ["a", "b"],
      [expense("e1", "a", 1000, ["a", "b"])],
      [settlement("s1", "b", "a", 700)],
    );
    expect(net).toEqual({ a: -200, b: 200 });
  });

  it("handles multiple expenses with different payers, and nets to zero", () => {
    const members = ["a", "b", "c"];
    const expenses = [
      expense("e1", "a", 100, members), // 33/33/34 with a paying
      expense("e2", "b", 1000, ["a", "b"]),
      expense("e3", "c", 7, ["b", "c"]),
    ];
    const settlements = [settlement("s1", "a", "c", 50)];
    const net = computeBalances(members, expenses, settlements);
    expect(sumValues(net)).toBe(0);
  });

  it("matches a hand-worked three-person example", () => {
    // a pays 300 for a,b,c (100 each). b pays 90 for b,c (45 each).
    // c pays 30 for c only (c owes self, no effect).
    const members = ["a", "b", "c"];
    const net = computeBalances(
      members,
      [
        expense("e1", "a", 300, members),
        expense("e2", "b", 90, ["b", "c"]),
        expense("e3", "c", 30, ["c"]),
      ],
      [],
    );
    // a: paid 300, owed 100 -> +200.
    // b: paid 90, owed 100 (e1) + 45 (e2) -> -55.
    // c: paid 30, owed 100 (e1) + 45 (e2) + 30 (e3) -> -145.
    // Sum: 200 - 55 - 145 = 0.
    expect(net).toEqual({ a: 200, b: -55, c: -145 });
  });

  it("rejects an expense whose shares do not sum to its total", () => {
    const bad: ExpenseRecord = {
      id: "e1",
      payerId: "a",
      totalPaise: 100,
      shares: [{ memberId: "a", paise: 40 }, { memberId: "b", paise: 40 }],
    };
    expect(() => computeBalances(["a", "b"], [bad], [])).toThrow(MoneyError);
  });

  it("rejects rows that reference unknown members", () => {
    const unknownPayer: ExpenseRecord = {
      id: "e1",
      payerId: "z",
      totalPaise: 100,
      shares: [{ memberId: "a", paise: 100 }],
    };
    expect(() => computeBalances(["a", "b"], [unknownPayer], [])).toThrow(/unknown member z/);
    expect(() => computeBalances(["a", "b"], [], [settlement("s1", "a", "z", 10)])).toThrow(
      /unknown member z/,
    );
  });

  it("rejects a settlement from a member to themselves and non-positive or fractional amounts", () => {
    expect(() => computeBalances(["a", "b"], [], [settlement("s1", "a", "a", 10)])).toThrow(MoneyError);
    expect(() => computeBalances(["a", "b"], [], [settlement("s1", "a", "b", 0)])).toThrow(MoneyError);
    expect(() => computeBalances(["a", "b"], [], [settlement("s1", "a", "b", 1.5)])).toThrow(MoneyError);
  });
});

describe("settleUp", () => {
  it("returns no transfers when everyone is square", () => {
    expect(settleUp({ a: 0, b: 0, c: 0 })).toEqual([]);
  });

  it("produces a single transfer for two people", () => {
    expect(settleUp({ a: 500, b: -500 })).toEqual([{ from: "b", to: "a", paise: 500 }]);
  });

  it("produces a minimal-ish plan for three people and zeroes every balance", () => {
    const balances = { a: 200, b: -55, c: -145 };
    const plan = settleUp(balances);
    expect(plan).toEqual([
      { from: "c", to: "a", paise: 145 },
      { from: "b", to: "a", paise: 55 },
    ]);
    // Applying the plan returns everyone to zero.
    const after: Record<string, number> = { ...balances };
    for (const t of plan) {
      after[t.from] += t.paise;
      after[t.to] -= t.paise;
    }
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
  });

  it("breaks ties deterministically by member id", () => {
    const plan = settleUp({ z: 100, a: 100, m: -100, b: -100 });
    expect(plan).toEqual([
      { from: "b", to: "a", paise: 100 },
      { from: "m", to: "z", paise: 100 },
    ]);
  });

  it("never emits a zero or negative transfer", () => {
    const plan = settleUp({ a: 333, b: -111, c: -111, d: -111 });
    expect(plan.every((t) => t.paise > 0)).toBe(true);
    expect(plan.reduce((acc, t) => acc + t.paise, 0)).toBe(333);
  });

  it("rejects balances that do not sum to zero", () => {
    expect(() => settleUp({ a: 100, b: -99 })).toThrow(MoneyError);
  });
});
