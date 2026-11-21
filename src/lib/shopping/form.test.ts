import { describe, expect, it } from "vitest";
import { parseShoppingForm } from "./form";

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("parseShoppingForm", () => {
  it("trims the name and keeps an optional quantity", () => {
    expect(parseShoppingForm(form({ name: "  Milk ", quantity: " 1 L " }))).toEqual({
      ok: true,
      item: { name: "Milk", quantity: "1 L" },
    });
  });

  it("stores a blank quantity as null", () => {
    expect(parseShoppingForm(form({ name: "Eggs", quantity: "  " }))).toEqual({
      ok: true,
      item: { name: "Eggs", quantity: null },
    });
  });

  it("rejects a blank name and over-long fields", () => {
    expect(parseShoppingForm(form({ name: "   " })).ok).toBe(false);
    expect(parseShoppingForm(form({ name: "x".repeat(121) })).ok).toBe(false);
    expect(parseShoppingForm(form({ name: "Milk", quantity: "x".repeat(41) })).ok).toBe(false);
  });
});
