"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NotificationList } from "./_components/notification-list";
import { PaginationBar } from "@/components/pagination-bar";
import { useNotifications, useMarkAsRead } from "@/hooks/notifications/use-notifications";
import type { NotificationItem, NotificationQuery } from "@/lib/api/types";
import type { PaginationMeta } from "@/lib/api/types";

export default function NotificationsPage() {
  const router = useRouter();
  const t = useTranslations("notifications");
  const [query, setQuery] = useState<NotificationQuery>({ page: 1, limit: 20 });
  const [unreadOnly, setUnreadOnly] = useState(true);
  const { data, isLoading } = useNotifications({ ...query, unreadOnly });
  const markAsRead = useMarkAsRead();

  const handleClickNotification = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    // Navigate to the referenced resource if available
    if (notification.referenceType === "chat_room") {
      router.push("/chat");
    } else if (notification.referenceType === "board_post" && notification.referenceId) {
      router.push(`/board/${notification.referenceId}`);
    } else if (notification.referenceType === "survey" && notification.referenceId) {
      router.push(`/surveys/${notification.referenceId}/respond`);
    } else if (notification.referenceType === "shop_order" && notification.referenceId) {
      router.push(`/shop/orders/${notification.referenceId}`);
    } else if (notification.referenceType === "skill_booking" && notification.referenceId) {
      router.push(`/skills/bookings/${notification.referenceId}`);
    }
  };

  const meta: PaginationMeta | undefined = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("heading.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("heading.description")}</p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="unread-filter"
          checked={unreadOnly}
          onCheckedChange={(checked) => {
            setUnreadOnly(checked);
            setQuery((prev) => ({ ...prev, page: 1 }));
          }}
        />
        <Label htmlFor="unread-filter">{t("filter.unreadOnly")}</Label>
      </div>

      <NotificationList
        notifications={data?.data ?? []}
        isLoading={isLoading}
        onClickNotification={handleClickNotification}
      />

      {meta && (
        <PaginationBar
          meta={meta}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  );
}
