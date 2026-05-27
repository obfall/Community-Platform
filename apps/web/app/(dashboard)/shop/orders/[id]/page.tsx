"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOrder, useUpdateOrderStatus } from "@/hooks/shop/use-shop";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { OrderStatusBadge } from "../../_components/order-status-badge";
import { ORDER_STATUS_NEXT_TRANSITIONS, type OrderStatus } from "@/lib/constants/order-status";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("shop.orderDetail");
  const tStatus = useTranslations("shop.orderStatus");
  const { id } = use(params);
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const backHref = from === "manage" ? "/shop/manage?tab=orders" : "/shop/orders";
  const { user } = useAuth();
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
  if (!order) return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>;

  const isBuyer = order.buyer.id === user?.id;
  const isSeller = order.seller.id === user?.id;
  const status = order.status as OrderStatus;
  const nextTransitions = ORDER_STATUS_NEXT_TRANSITIONS[status] ?? [];

  // 買い手は in_progress からのキャンセルのみ、販売者は全遷移可
  const availableTransitions = isSeller
    ? nextTransitions
    : isBuyer && status === "in_progress"
      ? (["canceled"] as OrderStatus[])
      : [];

  const buyerOnlyCancel = isBuyer && !isSeller && availableTransitions.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-bold">{t("title")}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{order.orderNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{t("items")}</div>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1 text-sm">
                <div>
                  <div>{item.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    &yen;{item.unitPrice.toLocaleString()} × {item.quantity}
                  </div>
                </div>
                <div className="font-semibold">&yen;{item.subtotal.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("total")}</span>
            <span className="text-xl font-bold">&yen;{order.totalAmount.toLocaleString()}</span>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">{t("buyer")}</div>
              <div>{order.buyer.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("seller")}</div>
              <div>{order.seller.name}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {t("orderedAt", { date: new Date(order.createdAt).toLocaleString("ja-JP") })}
            {order.completedAt && (
              <>
                {" / "}
                {t("completedAt", { date: new Date(order.completedAt).toLocaleString("ja-JP") })}
              </>
            )}
            {order.canceledAt && (
              <>
                {" / "}
                {t("canceledAt", { date: new Date(order.canceledAt).toLocaleString("ja-JP") })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {buyerOnlyCancel ? (
        <div className="flex justify-center">
          <Button
            variant="destructive"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: order.id, status: "canceled" })}
          >
            {t("cancelButton")}
          </Button>
        </div>
      ) : (
        availableTransitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("statusChange")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {availableTransitions.map((next) => (
                <Button
                  key={next}
                  variant={next === "canceled" ? "destructive" : "default"}
                  size="sm"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: order.id, status: next })}
                >
                  {t("transitionTo", { status: tStatus(next) })}
                </Button>
              ))}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
