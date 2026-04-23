"use client";

import { useState } from "react";
import { useNotifications, useMarkAsRead } from "@/hooks/notifications/use-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";

const ANNOUNCEMENT_TYPES = "announcement,event_announcement";
const COLLAPSED_COUNT = 3;

export function AnnouncementsWidget() {
  const { data, isLoading } = useNotifications({
    page: 1,
    limit: 100,
    type: ANNOUNCEMENT_TYPES,
    unreadOnly: true,
  });
  const markAsRead = useMarkAsRead();
  const [expanded, setExpanded] = useState(false);

  const announcements = data?.data ?? [];
  const visible = expanded ? announcements : announcements.slice(0, COLLAPSED_COUNT);
  const hiddenCount = announcements.length - COLLAPSED_COUNT;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="h-5 w-5" />
          お知らせ
          {announcements.length > 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({announcements.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">未読のお知らせはありません</p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => markAsRead.mutate(a.id)}
                    disabled={markAsRead.isPending}
                    className="w-full rounded-md p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <p className="font-semibold">{a.title}</p>
                    {a.body && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && (
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      折りたたむ
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />他 {hiddenCount} 件を表示
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
