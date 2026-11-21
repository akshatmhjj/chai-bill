/**
 * Shopping list form parser. Pure, relative imports only.
 */
export interface ParsedShoppingItem {
  name: string;
  quantity: string | null;
}

export type ShoppingParseResult = { ok: true; item: ParsedShoppingItem } | { ok: false; error: string };

export function parseShoppingForm(form: FormData): ShoppingParseResult {
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 1) return { ok: false, error: "Enter what to buy." };
  if (name.length > 120) return { ok: false, error: "Keep the item name under 120 characters." };

  const quantity = String(form.get("quantity") ?? "").trim();
  if (quantity.length > 40) return { ok: false, error: "Keep the quantity under 40 characters." };

  return { ok: true, item: { name, quantity: quantity || null } };
}
