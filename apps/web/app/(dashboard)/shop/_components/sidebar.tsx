"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SHOP_NAV_ITEMS } from "@/lib/shop-navigation";
import { useShopCapabilities } from "@/hooks/shop/use-shop";
import { ArrowLeft, ShoppingBag } from "lucide-react";

// 商品登録 /shop/new と商品編集 /shop/{id}/edit は「出品管理」配下のフロー扱い
function isSellerSubFlow(pathname: string): boolean {
  return pathname === "/shop/new" || /^\/shop\/[^/]+\/edit$/.test(pathname);
}

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/shop/seller") {
    return pathname === href || pathname.startsWith(`${href}/`) || isSellerSubFlow(pathname);
  }
  if (href === "/shop") {
    // 商品閲覧エリアのみアクティブ（/shop/orders・/shop/seller・出品管理サブフローは別項目）
    return (
      pathname === "/shop" ||
      (pathname.startsWith("/shop/") &&
        !pathname.startsWith("/shop/orders") &&
        !pathname.startsWith("/shop/seller") &&
        !isSellerSubFlow(pathname))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ShopSidebar() {
  const t = useTranslations("shop.sidebar");
  const pathname = usePathname();
  const { data: capabilities } = useShopCapabilities();

  const items = SHOP_NAV_ITEMS.filter(
    (item) => !item.requiresCreate || capabilities?.canCreateProduct,
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-3">
        <Link
          href="/dashboard"
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToMain")}
        </Link>

        <div className="mb-3 flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-accent/50">
            <ShoppingBag className="h-5 w-5 text-sidebar-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{t("title")}</p>
          </div>
        </div>

        <Separator className="mb-2" />

        {items.map((item) => {
          const isActive = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
