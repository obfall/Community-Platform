"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NotificationList } from "./_components/notification-list";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import type { NotificationItem, NotificationQuery } from "@/lib/api/types";
import type { PaginationMeta } from "@/lib/api/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [query, setQuery] = useState<NotificationQuery>({ page: 1, limit: 20 });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications({ ...query, unreadOnly });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleClickNotification = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    // Navigate to the referenced resource if available
    if (notification.referenceType === "board_post" && notification.referenceId) {
      router.push(`/board/${notification.referenceId}`);
    }
  };

  const meta: PaginationMeta | undefined = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通知</h1>
          <p className="mt-1 text-muted-foreground">あなたへの通知一覧</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/notifications/settings">
              <Settings className="mr-1 h-4 w-4" />
              通知設定
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            すべて既読
          </Button>
        </div>
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
        <Label htmlFor="unread-filter">未読のみ表示</Label>
      </div>

      <NotificationList
        notifications={data?.data ?? []}
        isLoading={isLoading}
        onClickNotification={handleClickNotification}
      />

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            全 {meta.total} 件中 {(meta.page - 1) * meta.limit + 1}〜
            {Math.min(meta.page * meta.limit, meta.total)} 件を表示
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
              disabled={!meta.hasPreviousPage}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              前へ
            </Button>
            <span className="text-sm text-muted-foreground">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
              disabled={!meta.hasNextPage}
            >
              次へ
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
