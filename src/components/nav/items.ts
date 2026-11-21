import { Bell, House, Receipt, Scale, ShoppingBasket, type LucideIcon } from "lucide-react";

export interface NavItem {
  /** Path inside the nest, e.g. "/expenses". The home item is "/". */
  path: string;
  label: string;
  icon: LucideIcon;
  /** Shown on the phone bottom bar. "Settle up" is reached from Home and the quick-add sheet. */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: House, mobile: true },
  { path: "/expenses", label: "Expenses", icon: Receipt, mobile: true },
  { path: "/balances", label: "Settle up", icon: Scale, mobile: false },
  { path: "/shopping", label: "Shopping", icon: ShoppingBasket, mobile: true },
  { path: "/activity", label: "Activity", icon: Bell, mobile: true },
];

/** The full URL of a nest path, e.g. nestHref("abc", "/expenses") -> "/n/abc/expenses". */
export function nestHref(nestId: string, path: string): string {
  return path === "/" ? `/n/${nestId}` : `/n/${nestId}${path}`;
}

/** Whether `pathname` is inside a nav item (the home item only matches the home page itself). */
export function isActive(pathname: string, nestId: string, path: string): boolean {
  const href = nestHref(nestId, path);
  if (path === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
