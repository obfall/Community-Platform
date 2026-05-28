"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_BADGE_VARIANT, type OrderStatus } from "@/lib/constants/order-status";

const ORDER_STATUS_KEYS: OrderStatus[] = ["in_progress", "in_negotiation", "completed", "canceled"];

export function OrderStatusBadge({ status }: { status: string }) {
  const t = useTranslations("shop.orderStatus");
  const key = status as OrderStatus;
  const label = ORDER_STATUS_KEYS.includes(key) ? t(key) : status;
  const variant = ORDER_STATUS_BADGE_VARIANT[key] ?? "outline";
  return <Badge variant={variant}>{label}</Badge>;
}
