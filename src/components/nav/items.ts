import { Bell, House, Receipt, Scale, ShoppingBasket, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown on the phone bottom bar. "Settle up" lives on Home and in the quick-add sheet there. */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House, mobile: true },
  { href: "/expenses", label: "Expenses", icon: Receipt, mobile: true },
  { href: "/balances", label: "Settle up", icon: Scale, mobile: false },
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket, mobile: true },
  { href: "/activity", label: "Activity", icon: Bell, mobile: true },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
