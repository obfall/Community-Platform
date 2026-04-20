"use client";

import Link from "next/link";
import { useOrders } from "@/hooks/shop/use-shop";
import { useAuth } from "@/hooks/auth/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import { OrderStatusBadge } from "../_components/order-status-badge";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();

  const buyerOrders = orders?.filter((o) => o.buyer.id === user?.id) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">注文履歴</h1>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : buyerOrders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-4 h-12 w-12" />
          <p>注文がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {buyerOrders.map((order) => (
            <Link key={order.id} href={`/shop/orders/${order.id}`}>
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
                    <span className="text-muted-foreground">販売者: {order.seller.name}</span>
                    <span className="font-bold">&yen;{order.totalAmount.toLocaleString()}</span>
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
