import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_KEYS, guessCategory, isCategoryKey } from "./categories";

describe("categories", () => {
  it("defines every key with a label and colour", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORIES[key].key).toBe(key);
      expect(CATEGORIES[key].hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("validates keys", () => {
    expect(isCategoryKey("groceries")).toBe(true);
    expect(isCategoryKey("crypto")).toBe(false);
  });

  it.each([
    ["Milk and eggs", "groceries"],
    ["BigBasket order", "groceries"],
    ["Chai at the corner", "food"],
    ["Swiggy dinner", "food"],
    ["November rent", "rent"],
    ["Wifi bill", "utilities"],
    ["Uber to the airport", "transport"],
    ["Cleaning supplies", "household"],
    ["Netflix", "fun"],
    ["Pharmacy run", "health"],
  ])("guesses %s as %s", (text, expected) => {
    expect(guessCategory(text)).toBe(expected);
  });

  it("returns null when nothing matches or the text is empty", () => {
    expect(guessCategory("Thing")).toBeNull();
    expect(guessCategory("")).toBeNull();
  });
});
