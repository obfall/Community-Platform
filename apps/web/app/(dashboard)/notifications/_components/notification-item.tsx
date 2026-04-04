"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { NotificationItem } from "@/lib/api/types";

interface NotificationItemProps {
  notification: NotificationItem;
  onClick: (notification: NotificationItem) => void;
}

export function NotificationItemCard({ notification, onClick }: NotificationItemProps) {
  const initials = notification.actor?.name ? notification.actor.name.slice(0, 2) : "?";

  return (
    <button
      onClick={() => onClick(notification)}
      className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
        notification.isRead ? "opacity-60" : "border-primary/20 bg-primary/5"
      }`}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className={`text-sm ${notification.isRead ? "" : "font-semibold"}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: ja,
          })}
        </p>
      </div>

      {!notification.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}
