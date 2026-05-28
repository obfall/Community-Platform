"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useShopCapabilities } from "@/hooks/shop/use-shop";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellerProductsTab } from "../_components/seller-products-tab";
import { SellerOrdersTab } from "../_components/seller-orders-tab";
import { SellerSummaryTab } from "../_components/seller-summary-tab";

export default function ShopSellerPage() {
  const t = useTranslations("shop.seller");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "products";
  const { data: capabilities, isLoading } = useShopCapabilities();

  useEffect(() => {
    if (!isLoading && !capabilities?.canCreateProduct) {
      router.replace("/shop");
    }
  }, [isLoading, capabilities, router]);

  if (isLoading || !capabilities?.canCreateProduct) {
    return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="products">{t("tabProducts")}</TabsTrigger>
          <TabsTrigger value="orders">{t("tabOrders")}</TabsTrigger>
          <TabsTrigger value="summary">{t("tabSummary")}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <SellerProductsTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <SellerOrdersTab backTo="seller" />
        </TabsContent>
        <TabsContent value="summary" className="mt-6">
          <SellerSummaryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
