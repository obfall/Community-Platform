import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_BADGE_VARIANT,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/constants/order-status";

export function OrderStatusBadge({ status }: { status: string }) {
  const key = status as OrderStatus;
  const label = ORDER_STATUS_LABELS[key] ?? status;
  const variant = ORDER_STATUS_BADGE_VARIANT[key] ?? "outline";
  return <Badge variant={variant}>{label}</Badge>;
}
