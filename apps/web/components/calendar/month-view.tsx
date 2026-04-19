"use client";

import { useMemo } from "react";
import type { CalendarItem } from "./types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const COLOR_CLASS: Record<CalendarItem["color"], string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  gray: "bg-muted text-muted-foreground",
};

function fmtKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Props {
  cursor: Date;
  items: CalendarItem[];
  onDayClick: (date: Date, items: CalendarItem[]) => void;
}

export function MonthView({ cursor, items, onDayClick }: Props) {
  const today = new Date();
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);

  const days: Date[] = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(1 - monthStart.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.getFullYear(), cursor.getMonth()]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = fmtKey(new Date(item.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="p-2 text-center text-xs font-semibold">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const key = fmtKey(d);
          const dayItems = itemsByDay.get(key) ?? [];
          return (
            <button
              key={i}
              onClick={() => onDayClick(d, dayItems)}
              className={`min-h-24 border-r border-b p-1 text-left hover:bg-muted/30 transition-colors ${
                inMonth ? "" : "bg-muted/20 text-muted-foreground"
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-primary" : ""}`}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick?.();
                    }}
                    className={`truncate rounded px-1 text-[10px] cursor-pointer ${COLOR_CLASS[item.color]}`}
                  >
                    {item.isAllDay
                      ? ""
                      : `${new Date(item.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} `}
                    {item.title}
                  </div>
                ))}
                {dayItems.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">+{dayItems.length - 2}件</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
