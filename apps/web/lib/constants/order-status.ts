export type OrderStatus = "in_progress" | "in_negotiation" | "completed" | "canceled";

// ステータスの表示ラベルは i18n（messages/ja/shop.json の orderStatus）で管理する。
// この定数ファイルは遷移ルール・バッジ配色などロジック面のみを担う。

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
