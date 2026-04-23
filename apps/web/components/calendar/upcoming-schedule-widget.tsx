"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSchedules } from "@/hooks/calendar/use-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, ArrowRight, Clock, MapPin } from "lucide-react";

export function UpcomingScheduleWidget() {
  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { startAt: start.toISOString(), endAt: end.toISOString() };
  }, []);

  const { data: schedules, isLoading } = useSchedules(range);

  const sorted = [...(schedules ?? [])]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 3);

  const formatDateTime = (dateStr: string, isAllDay: boolean) => {
    const d = new Date(dateStr);
    if (isAllDay) {
      return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" });
    }
    return d.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5" />
          今日・今週の予定
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile/calendar">
            すべて見る <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">予定はありません</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((s) => (
              <li key={s.id}>
                <Link href="/profile/calendar" className="block rounded-md p-2 hover:bg-accent">
                  <p className="font-medium">{s.title}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(s.startAt, s.isAllDay)}
                    </span>
                    {s.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {s.location}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
