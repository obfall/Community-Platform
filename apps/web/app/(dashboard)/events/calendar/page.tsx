"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCalendarEvents } from "@/hooks/use-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import type { CalendarEvent } from "@/lib/api/types";

export default function EventCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 月の最初と最後
  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: events } = useCalendarEvents(from, to);

  // 日付ごとにイベントをグループ化
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events?.forEach((event) => {
      const dateKey = new Date(event.startAt).toISOString().split("T")[0]!;
      const existing = map.get(dateKey) ?? [];
      map.set(dateKey, [...existing, event]);
    });
    return map;
  }, [events]);

  // カレンダーグリッド生成
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">イベントカレンダー</h1>
      </div>

      {/* 月ナビゲーション */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">
          {year}年{month + 1}月
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="min-h-24" />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const isToday = dateKey === today;

          return (
            <Card key={dateKey} className={`min-h-24 ${isToday ? "border-primary" : ""}`}>
              <CardContent className="p-2">
                <p
                  className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                >
                  {day}
                </p>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Badge
                        variant="secondary"
                        className="w-full cursor-pointer justify-start truncate text-xs"
                      >
                        {new Date(event.startAt).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {event.title}
                      </Badge>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{dayEvents.length - 3}件</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
