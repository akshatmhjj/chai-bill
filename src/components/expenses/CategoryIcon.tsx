import {
  Clapperboard,
  Coffee,
  HeartPulse,
  House,
  Receipt,
  ShoppingBasket,
  Sofa,
  Train,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

export const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  groceries: ShoppingBasket,
  food: Coffee,
  rent: House,
  utilities: Zap,
  transport: Train,
  household: Sofa,
  fun: Clapperboard,
  health: HeartPulse,
  other: Receipt,
};

/** A rounded tile with the category's icon, tinted with its colour on whatever surface it sits on. */
export function CategoryTile({ category, size = 44 }: { category: CategoryKey | null; size?: number }) {
  const key = category ?? "other";
  const Icon = CATEGORY_ICONS[key];
  const hex = category ? CATEGORIES[key].hex : "var(--ink-3)";
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: `color-mix(in srgb, ${hex} 16%, var(--surface))`,
        color: hex,
      }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.1} />
    </span>
  );
}
