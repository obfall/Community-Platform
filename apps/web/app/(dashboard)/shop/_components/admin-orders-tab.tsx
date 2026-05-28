"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAdminOrders } from "@/hooks/shop/use-shop";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt } from "lucide-react";
import { OrderStatusBadge } from "./order-status-badge";

// EC管理（manage_all_products）向け: システム全体の注文一覧。販売者・買い手の両方を表示する。
export function AdminOrdersTab() {
  const t = useTranslations("shop.manage");
  const tStatus = useTranslations("shop.orderStatus");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: orders, isLoading } = useAdminOrders(
    statusFilter === "all" ? undefined : statusFilter,
  );

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">{t("orderTabAll")}</TabsTrigger>
          <TabsTrigger value="in_progress">{tStatus("in_progress")}</TabsTrigger>
          <TabsTrigger value="in_negotiation">{tStatus("in_negotiation")}</TabsTrigger>
          <TabsTrigger value="completed">{tStatus("completed")}</TabsTrigger>
          <TabsTrigger value="canceled">{tStatus("canceled")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : !orders || orders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-4 h-12 w-12" />
          <p>{t("emptyOrders")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/shop/orders/${order.id}?from=manage`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">{order.orderNumber}</div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="mb-2 text-sm">
                    {order.items.map((item) => (
                      <div key={item.id} className="line-clamp-1">
                        {item.productName} × {item.quantity}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("orderParties", { seller: order.seller.name, buyer: order.buyer.name })}
                    </span>
                    <span className="font-bold">¥{order.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
