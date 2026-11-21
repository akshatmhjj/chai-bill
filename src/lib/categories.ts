/** Expense categories. Optional on every expense; they only change how an expense looks and groups. */
export const CATEGORY_KEYS = [
  "groceries",
  "food",
  "rent",
  "utilities",
  "transport",
  "household",
  "fun",
  "health",
  "other",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  /** Tile and icon colour. Blended with the surface, so it works in light and dark. */
  hex: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  groceries: { key: "groceries", label: "Groceries", hex: "#3e8e5a" },
  food: { key: "food", label: "Chai & food", hex: "#c4501a" },
  rent: { key: "rent", label: "Rent", hex: "#6f72d8" },
  utilities: { key: "utilities", label: "Bills", hex: "#d99a14" },
  transport: { key: "transport", label: "Travel", hex: "#4f9ad6" },
  household: { key: "household", label: "Home stuff", hex: "#8e7ab5" },
  fun: { key: "fun", label: "Fun", hex: "#d9577f" },
  health: { key: "health", label: "Health", hex: "#2f9c94" },
  other: { key: "other", label: "Other", hex: "#7a6a5c" },
};

export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && (CATEGORY_KEYS as readonly string[]).includes(value);
}

/** Words that hint at a category. Matched against whole words, lower-cased. */
const HINTS: Record<Exclude<CategoryKey, "other">, string[]> = {
  groceries: ["grocery", "groceries", "milk", "eggs", "egg", "vegetables", "veggies", "fruit", "fruits", "bread", "rice", "atta", "dal", "paneer", "curd", "bigbasket", "blinkit", "zepto", "instamart", "dmart", "supermarket"],
  food: ["chai", "tea", "coffee", "lunch", "dinner", "breakfast", "snacks", "pizza", "biryani", "zomato", "swiggy", "restaurant", "cafe", "dosa", "food", "takeout", "order"],
  rent: ["rent", "deposit", "maintenance", "brokerage"],
  utilities: ["electricity", "wifi", "internet", "broadband", "gas", "cylinder", "water", "bill", "recharge", "dth", "jio", "airtel"],
  transport: ["uber", "ola", "rapido", "cab", "auto", "petrol", "fuel", "metro", "bus", "train", "flight", "ticket"],
  household: ["cleaning", "detergent", "soap", "repair", "plumber", "maid", "furniture", "bulb", "kitchen", "utensils", "supplies"],
  fun: ["movie", "movies", "netflix", "spotify", "party", "trip", "game", "games", "concert", "drinks", "beer"],
  health: ["medicine", "medicines", "pharmacy", "doctor", "clinic", "gym", "vitamins"],
};

/** A best guess at the category from a description, or null when nothing matches. */
export function guessCategory(description: string): CategoryKey | null {
  const words = description.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const word of words) {
    for (const [key, hints] of Object.entries(HINTS)) {
      if (hints.includes(word)) return key as CategoryKey;
    }
  }
  return null;
}
