export type OrderStatus = "in_progress" | "in_negotiation" | "completed" | "canceled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  in_progress: "申込中",
  in_negotiation: "取引中",
  completed: "完了",
  canceled: "キャンセル",
};

export const ORDER_STATUS_BADGE_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  in_progress: "default",
  in_negotiation: "secondary",
  completed: "outline",
  canceled: "destructive",
};

export const ORDER_STATUS_NEXT_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  in_progress: ["in_negotiation", "canceled"],
  in_negotiation: ["completed", "canceled"],
  completed: [],
  canceled: [],
};
