"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/auth/use-auth";
import { useEvents } from "@/hooks/events/use-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight, MapPin, Clock } from "lucide-react";
import { PendingSurveysWidget } from "@/components/surveys/pending-surveys-widget";
import { AnnouncementsWidget } from "@/components/notifications/announcements-widget";
import { UpcomingScheduleWidget } from "@/components/calendar/upcoming-schedule-widget";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    limit: 3,
    status: "recruiting",
  });

  const upcomingEvents = (eventsData?.data ?? eventsData ?? []) as Array<{
    id: string;
    title: string;
    startAt: string;
    venueName: string | null;
    locationType: string;
    status: string;
  }>;

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ようこそ{user?.name ? `、${user.name}さん` : ""}</h1>

      <PendingSurveysWidget />

      <AnnouncementsWidget />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 今後のイベント */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5" />
              今後のイベント
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events">
                すべて見る <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">予定されているイベントはありません</p>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="block rounded-md p-2 hover:bg-accent">
                      <p className="font-medium">{e.title}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(e.startAt)}
                        </span>
                        {e.venueName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {e.venueName}
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

        {/* 今日・今週の予定 */}
        <UpcomingScheduleWidget />
      </div>
    </div>
  );
}
