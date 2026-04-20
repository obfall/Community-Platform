import { ShoppingBag, Receipt, Store, type LucideIcon } from "lucide-react";

export interface ShopNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  requiresSeller?: boolean;
}

export const SHOP_NAV_ITEMS: ShopNavItem[] = [
  { label: "ショップ", href: "/shop", icon: ShoppingBag },
  { label: "注文履歴", href: "/shop/orders", icon: Receipt },
  { label: "販売管理", href: "/shop/seller", icon: Store, requiresSeller: true },
];

export function isShopPath(pathname: string): boolean {
  return pathname === "/shop" || pathname.startsWith("/shop/");
}
