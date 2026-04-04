"use client";

import { NotificationItemCard } from "./notification-item";
import type { NotificationItem } from "@/lib/api/types";

interface NotificationListProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  onClickNotification: (notification: NotificationItem) => void;
}

export function NotificationList({
  notifications,
  isLoading,
  onClickNotification,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        通知はありません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationItemCard
          key={notification.id}
          notification={notification}
          onClick={onClickNotification}
        />
      ))}
    </div>
  );
}
