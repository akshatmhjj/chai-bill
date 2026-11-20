import { describe, expect, it } from "vitest";
import { buildHouseholdSummary } from "./summary";
import { splitEqual } from "./split";

const A = "alice";
const B = "bob";
const C = "carol";

describe("buildHouseholdSummary", () => {
  it("is all zero with no activity", () => {
    const s = buildHouseholdSummary({ members: [A, B], expenses: [], settlements: [] });
    expect(s.balances).toEqual({ alice: 0, bob: 0 });
    expect(s.transfers).toEqual([]);
  });

  it("shows the debt after one shared expense", () => {
    const s = buildHouseholdSummary({
      members: [A, B],
      expenses: [{ id: "e1", payerId: A, totalPaise: 100000, shares: splitEqual(100000, [A, B], A) }],
      settlements: [],
    });
    expect(s.balances).toEqual({ alice: 50000, bob: -50000 });
    expect(s.transfers).toEqual([{ from: B, to: A, paise: 50000 }]);
  });

  it("reduces the debt by a partial settlement and keeps the rest outstanding", () => {
    const s = buildHouseholdSummary({
      members: [A, B],
      expenses: [{ id: "e1", payerId: A, totalPaise: 100000, shares: splitEqual(100000, [A, B], A) }],
      settlements: [{ id: "s1", fromId: B, toId: A, paise: 20000 }],
    });
    expect(s.balances).toEqual({ alice: 30000, bob: -30000 });
    expect(s.transfers).toEqual([{ from: B, to: A, paise: 30000 }]);
  });

  it("clears to no transfers once fully settled", () => {
    const s = buildHouseholdSummary({
      members: [A, B],
      expenses: [{ id: "e1", payerId: A, totalPaise: 100000, shares: splitEqual(100000, [A, B], A) }],
      settlements: [{ id: "s1", fromId: B, toId: A, paise: 50000 }],
    });
    expect(s.transfers).toEqual([]);
  });

  it("nets several expenses and a settlement across three people, and the plan clears every balance", () => {
    const members = [A, B, C];
    const expenses = [
      { id: "e1", payerId: A, totalPaise: 1001, shares: splitEqual(1001, members, A) },
      { id: "e2", payerId: B, totalPaise: 9000, shares: splitEqual(9000, [B, C], B) },
      { id: "e3", payerId: C, totalPaise: 250, shares: splitEqual(250, [A, C], C) },
    ];
    const settlements = [{ id: "s1", fromId: C, toId: B, paise: 1000 }];
    const s = buildHouseholdSummary({ members, expenses, settlements });

    expect(Object.values(s.balances).reduce((a, b) => a + b, 0)).toBe(0);

    // Apply the plan and confirm everyone ends at zero.
    const after: Record<string, number> = { ...s.balances };
    for (const t of s.transfers) {
      expect(t.paise).toBeGreaterThan(0);
      after[t.from] += t.paise;
      after[t.to] -= t.paise;
    }
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
  });
});
