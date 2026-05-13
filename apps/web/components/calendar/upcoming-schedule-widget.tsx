"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSchedules } from "@/hooks/calendar/use-calendar";
import { useMyUpcomingEvents } from "@/hooks/events/use-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, ArrowRight, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const WINDOW_DAYS = 7;
const COLLAPSED_COUNT = 3;

type Item = {
  type: "schedule" | "event";
  id: string;
  href: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
};

export function UpcomingScheduleWidget() {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard.upcomingSchedule");
  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + WINDOW_DAYS);
    return { startAt: start.toISOString(), endAt: end.toISOString() };
  }, []);

  const { data: schedules, isLoading: schedulesLoading } = useSchedules(range);
  const { data: myEvents, isLoading: eventsLoading } = useMyUpcomingEvents(WINDOW_DAYS);

  const now = new Date().getTime();
  const scheduleItems: Item[] = (schedules ?? [])
    .filter((s) => new Date(s.endAt).getTime() >= now)
    .map((s) => ({
      type: "schedule",
      id: `schedule-${s.id}`,
      href: "/profile/calendar",
      title: s.title,
      startAt: s.startAt,
      endAt: s.endAt,
      isAllDay: s.isAllDay,
      location: s.location,
    }));
  const eventItems: Item[] = (myEvents ?? [])
    .filter((e) => new Date(e.endAt).getTime() >= now)
    .map((e) => ({
      type: "event",
      id: `event-${e.eventId}`,
      href: `/events/${e.eventId}`,
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      isAllDay: false,
      location: e.venueName,
    }));
  const items: Item[] = [...scheduleItems, ...eventItems].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hiddenCount = items.length - COLLAPSED_COUNT;
  const isLoading = schedulesLoading || eventsLoading;

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
          {t("title")}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile/calendar">
            {tCommon("seeAll")} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="block rounded-md p-2 hover:bg-accent">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          item.type === "event"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.type === "event" ? t("eventBadge") : t("scheduleBadge")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.title}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(item.startAt, item.isAllDay)}
                          </span>
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
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
