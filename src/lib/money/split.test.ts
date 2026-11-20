import { describe, expect, it } from "vitest";
import { MoneyError } from "./paise";
import { splitByAmount, splitByBasisPoints, splitEqual } from "./split";

const sum = (xs: { paise: number }[]) => xs.reduce((acc, x) => acc + x.paise, 0);

describe("splitEqual", () => {
  it("splits evenly when the total divides exactly", () => {
    const result = splitEqual(10000, ["a", "b"], "a");
    expect(result).toEqual([
      { memberId: "a", paise: 5000 },
      { memberId: "b", paise: 5000 },
    ]);
  });

  it("gives the leftover paisa to the payer", () => {
    // 100 paise among 3: 33 each, leftover 1 goes to payer "b".
    const result = splitEqual(100, ["a", "b", "c"], "b");
    expect(result).toEqual([
      { memberId: "a", paise: 33 },
      { memberId: "b", paise: 34 },
      { memberId: "c", paise: 33 },
    ]);
    expect(sum(result)).toBe(100);
  });

  it("handles a total smaller than the number of people", () => {
    // 1 paisa among 3: payer takes it, others get zero.
    const result = splitEqual(1, ["a", "b", "c"], "c");
    expect(result).toEqual([
      { memberId: "a", paise: 0 },
      { memberId: "b", paise: 0 },
      { memberId: "c", paise: 1 },
    ]);
  });

  it("keeps the sum exact for a large, awkward total across many people", () => {
    const people = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
    const total = 9_999_999_999; // just under 100 crore rupees, in paise
    const result = splitEqual(total, people, "p7");
    expect(sum(result)).toBe(total);
    const others = result.filter((r) => r.memberId !== "p7").map((r) => r.paise);
    expect(new Set(others).size).toBe(1);
    expect(result.find((r) => r.memberId === "p7")!.paise).toBeGreaterThanOrEqual(others[0]);
  });

  it("rejects a payer who is not a participant", () => {
    expect(() => splitEqual(100, ["a", "b"], "z")).toThrow(MoneyError);
  });

  it("rejects duplicate participants, empty participants, and zero totals", () => {
    expect(() => splitEqual(100, ["a", "a"], "a")).toThrow(MoneyError);
    expect(() => splitEqual(100, [], "a")).toThrow(MoneyError);
    expect(() => splitEqual(0, ["a"], "a")).toThrow(MoneyError);
  });

  it("rejects non-integer and negative totals", () => {
    expect(() => splitEqual(10.5, ["a", "b"], "a")).toThrow(MoneyError);
    expect(() => splitEqual(-100, ["a", "b"], "a")).toThrow(MoneyError);
  });
});

describe("splitByAmount", () => {
  it("accepts exact custom amounts that sum to the total", () => {
    const result = splitByAmount(1000, [
      { memberId: "a", paise: 700 },
      { memberId: "b", paise: 300 },
    ]);
    expect(result).toEqual([
      { memberId: "a", paise: 700 },
      { memberId: "b", paise: 300 },
    ]);
  });

  it("allows a zero share", () => {
    const result = splitByAmount(500, [
      { memberId: "a", paise: 500 },
      { memberId: "b", paise: 0 },
    ]);
    expect(sum(result)).toBe(500);
  });

  it("rejects amounts that do not sum to the total, with no automatic rounding", () => {
    expect(() =>
      splitByAmount(1000, [
        { memberId: "a", paise: 333 },
        { memberId: "b", paise: 333 },
        { memberId: "c", paise: 333 },
      ]),
    ).toThrow(/sum to 999/);
  });

  it("rejects negative and fractional shares", () => {
    expect(() =>
      splitByAmount(100, [
        { memberId: "a", paise: 150 },
        { memberId: "b", paise: -50 },
      ]),
    ).toThrow(MoneyError);
    expect(() =>
      splitByAmount(100, [
        { memberId: "a", paise: 50.5 },
        { memberId: "b", paise: 49.5 },
      ]),
    ).toThrow(MoneyError);
  });
});

describe("splitByBasisPoints", () => {
  it("splits by percentage and gives the rounding remainder to the payer", () => {
    // 100 paise at 33.33% / 33.33% / 33.34%. Floors: 33, 33, 33. Remainder 1 to payer "c".
    const result = splitByBasisPoints(
      100,
      [
        { memberId: "a", basisPoints: 3333 },
        { memberId: "b", basisPoints: 3333 },
        { memberId: "c", basisPoints: 3334 },
      ],
      "c",
    );
    expect(result).toEqual([
      { memberId: "a", paise: 33 },
      { memberId: "b", paise: 33 },
      { memberId: "c", paise: 34 },
    ]);
    expect(sum(result)).toBe(100);
  });

  it("gives the remainder to the payer even when the payer has the smaller percentage", () => {
    // 10 paise, 50/50 would be 5/5 with no remainder; use 30/70 on 3 paise.
    // floor(3*3000/10000)=0, floor(3*7000/10000)=2, remainder 1 goes to payer "a".
    const result = splitByBasisPoints(
      3,
      [
        { memberId: "a", basisPoints: 3000 },
        { memberId: "b", basisPoints: 7000 },
      ],
      "a",
    );
    expect(result).toEqual([
      { memberId: "a", paise: 1 },
      { memberId: "b", paise: 2 },
    ]);
  });

  it("stays exact for very large totals (BigInt intermediate)", () => {
    const total = 9_000_000_000_000; // 9 * 10^12 paise
    const result = splitByBasisPoints(
      total,
      [
        { memberId: "a", basisPoints: 6667 },
        { memberId: "b", basisPoints: 3333 },
      ],
      "b",
    );
    expect(sum(result)).toBe(total);
    expect(result[0].paise).toBe(6_000_300_000_000);
  });

  it("rejects basis points that do not sum to 10000", () => {
    expect(() =>
      splitByBasisPoints(
        100,
        [
          { memberId: "a", basisPoints: 5000 },
          { memberId: "b", basisPoints: 4999 },
        ],
        "a",
      ),
    ).toThrow(/sum to 9999/);
  });

  it("rejects non-integer or out-of-range basis points", () => {
    expect(() =>
      splitByBasisPoints(100, [{ memberId: "a", basisPoints: 10000.5 }, { memberId: "b", basisPoints: -0.5 }], "a"),
    ).toThrow(MoneyError);
    expect(() =>
      splitByBasisPoints(100, [{ memberId: "a", basisPoints: 10001 }, { memberId: "b", basisPoints: -1 }], "a"),
    ).toThrow(MoneyError);
  });

  it("rejects a payer who is not a participant", () => {
    expect(() =>
      splitByBasisPoints(100, [{ memberId: "a", basisPoints: 10000 }], "z"),
    ).toThrow(MoneyError);
  });
});
