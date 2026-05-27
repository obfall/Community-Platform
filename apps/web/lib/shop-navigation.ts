import { ShoppingBag, Receipt, type LucideIcon } from "lucide-react";

export interface ShopNavItem {
  /** messages/ja/shop.json の sidebar 名前空間のキー */
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export const SHOP_NAV_ITEMS: ShopNavItem[] = [
  { labelKey: "navShop", href: "/shop", icon: ShoppingBag },
  { labelKey: "navOrders", href: "/shop/orders", icon: Receipt },
];

export function isShopPath(pathname: string): boolean {
  // 商品管理系（一覧・登録・編集）は管理メニューなので EC・ショップのサブメニューは出さない
  if (
    pathname === "/shop/manage" ||
    pathname.startsWith("/shop/manage/") ||
    pathname === "/shop/new" ||
    /^\/shop\/[^/]+\/edit$/.test(pathname)
  ) {
    return false;
  }
  return pathname === "/shop" || pathname.startsWith("/shop/");
}
