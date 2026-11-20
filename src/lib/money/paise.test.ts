import { describe, expect, it } from "vitest";
import { assertPaise, formatINR, MoneyError, parseRupeesToPaise } from "./paise";

describe("parseRupeesToPaise", () => {
  it.each([
    ["0", 0],
    ["1", 100],
    ["1234", 123400],
    ["1234.5", 123450],
    ["1234.50", 123450],
    ["0.01", 1],
    ["1,234.56", 123456],
    ["₹ 99.99", 9999],
    [" 12 ", 1200],
  ])("parses %s to %i paise", (input, expected) => {
    expect(parseRupeesToPaise(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1.234", "1.", ".5", "1e3", "12.3.4", "₹", "1 000.00 00"])(
    "rejects %s",
    (input) => {
      expect(() => parseRupeesToPaise(input)).toThrow(MoneyError);
    },
  );

  it("avoids float drift that plain Number multiplication would introduce", () => {
    // 0.29 * 100 === 28.999999999999996 in floats; parsing must still give 29.
    expect(parseRupeesToPaise("0.29")).toBe(29);
    expect(parseRupeesToPaise("1.15")).toBe(115);
  });
});

describe("formatINR", () => {
  it.each([
    [0, "₹0.00"],
    [5, "₹0.05"],
    [100, "₹1.00"],
    [123450, "₹1,234.50"],
    [12345650, "₹1,23,456.50"],
    [1000000000, "₹1,00,00,000.00"],
    [-250, "-₹2.50"],
  ])("formats %i as %s", (paise, expected) => {
    expect(formatINR(paise)).toBe(expected);
  });

  it("rejects non-integer paise", () => {
    expect(() => formatINR(1.5)).toThrow(MoneyError);
  });
});

describe("assertPaise", () => {
  it("accepts non-negative safe integers", () => {
    expect(() => assertPaise(0)).not.toThrow();
    expect(() => assertPaise(Number.MAX_SAFE_INTEGER)).not.toThrow();
  });

  it("rejects negatives, fractions, NaN and unsafe integers", () => {
    expect(() => assertPaise(-1)).toThrow(MoneyError);
    expect(() => assertPaise(0.5)).toThrow(MoneyError);
    expect(() => assertPaise(Number.NaN)).toThrow(MoneyError);
    expect(() => assertPaise(Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyError);
  });
});
