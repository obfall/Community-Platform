import { ShoppingBag, Receipt, Store, type LucideIcon } from "lucide-react";

export interface ShopNavItem {
  /** messages/ja/shop.json の sidebar 名前空間のキー */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  /** 出品権限（canCreateProduct）を持つユーザーにのみ表示する */
  requiresCreate?: boolean;
}

export const SHOP_NAV_ITEMS: ShopNavItem[] = [
  { labelKey: "navShop", href: "/shop", icon: ShoppingBag },
  { labelKey: "navSeller", href: "/shop/seller", icon: Store, requiresCreate: true },
  { labelKey: "navOrders", href: "/shop/orders", icon: Receipt },
];

export function isShopPath(pathname: string): boolean {
  // /shop/manage は全体管理メニュー（コミュニティ管理）配下なのでショップサイドバーは出さない
  if (pathname === "/shop/manage" || pathname.startsWith("/shop/manage/")) {
    return false;
  }
  return pathname === "/shop" || pathname.startsWith("/shop/");
}
