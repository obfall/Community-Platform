"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import type { CalendarItem, CalendarView } from "./types";

interface Props {
  items: CalendarItem[];
  onDayClick?: (date: Date, items: CalendarItem[]) => void;
  defaultView?: CalendarView;
}

function startOfWeek(d: Date) {
  const result = new Date(d);
  result.setDate(d.getDate() - d.getDay());
  return result;
}

export function Calendar({ items, onDayClick, defaultView = "month" }: Props) {
  const [view, setView] = useState<CalendarView>(defaultView);
  const [cursor, setCursor] = useState(() => new Date());

  const handlePrev = () => {
    if (view === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    } else {
      const d = new Date(cursor);
      d.setDate(d.getDate() - 7);
      setCursor(d);
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    } else {
      const d = new Date(cursor);
      d.setDate(d.getDate() + 7);
      setCursor(d);
    }
  };

  const handleToday = () => setCursor(new Date());

  const title = () => {
    if (view === "month") {
      return `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;
    }
    const ws = startOfWeek(cursor);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    if (ws.getMonth() === we.getMonth()) {
      return `${ws.getFullYear()}年 ${ws.getMonth() + 1}月 ${ws.getDate()}日 〜 ${we.getDate()}日`;
    }
    return `${ws.getMonth() + 1}月${ws.getDate()}日 〜 ${we.getMonth() + 1}月${we.getDate()}日`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-56 text-center font-semibold">{title()}</span>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            今日
          </Button>
        </div>
        <div className="flex rounded-md border overflow-hidden">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-sm transition-colors ${view === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            月
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 text-sm transition-colors border-l ${view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            週
          </button>
        </div>
      </div>

      {view === "month" ? (
        <MonthView cursor={cursor} items={items} onDayClick={onDayClick ?? (() => {})} />
      ) : (
        <WeekView cursor={cursor} items={items} onDayClick={onDayClick ?? (() => {})} />
      )}
    </div>
  );
}

export type { CalendarItem, CalendarView };
