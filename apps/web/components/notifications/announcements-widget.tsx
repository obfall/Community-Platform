"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/notifications/use-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";

const ANNOUNCEMENT_TYPES = "announcement,event_announcement";
const COLLAPSED_COUNT = 3;
const FETCH_LIMIT = 100;

export function AnnouncementsWidget() {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard.announcements");
  const { data, isLoading } = useNotifications({
    page: 1,
    limit: FETCH_LIMIT,
    type: ANNOUNCEMENT_TYPES,
    unreadOnly: true,
  });
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
          {t("title")}
          {announcements.length > 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({announcements.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((a) => (
                <li key={a.id} className="rounded-md p-2">
                  <p className="font-semibold">{a.title}</p>
                  {a.body && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && (
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      {tCommon("collapse")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />
                      {tCommon("showMoreCount", { count: hiddenCount })}
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
