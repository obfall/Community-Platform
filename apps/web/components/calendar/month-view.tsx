"use client";

import { useMemo } from "react";
import type { CalendarItem } from "./types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const VISIBLE_LANES = 3;
const MS_PER_DAY = 86400000;

const COLOR_CLASS: Record<CalendarItem["color"], string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  gray: "bg-muted text-muted-foreground",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
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

  const weeks = useMemo(() => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(1 - monthStart.getDay());
    return Array.from({ length: 6 }, (_, wi) =>
      Array.from({ length: 7 }, (_, di) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + wi * 7 + di);
        return d;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.getFullYear(), cursor.getMonth()]);

  const normalized = useMemo(
    () =>
      items.map((item) => ({
        item,
        startDay: startOfDay(new Date(item.startAt)),
        endDay: startOfDay(new Date(item.endAt)),
      })),
    [items],
  );

  // 週ごとにアイテムをクリップしてレーン割り当て
  const weekBars = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0]!;
      const weekEnd = week[6]!;
      const overlapping = normalized
        .filter(({ startDay, endDay }) => endDay >= weekStart && startDay <= weekEnd)
        .map(({ item, startDay, endDay }) => {
          const segStart = startDay < weekStart ? weekStart : startDay;
          const segEnd = endDay > weekEnd ? weekEnd : endDay;
          const startCol = Math.round((segStart.getTime() - weekStart.getTime()) / MS_PER_DAY);
          const endCol = Math.round((segEnd.getTime() - weekStart.getTime()) / MS_PER_DAY);
          return {
            item,
            startCol,
            endCol,
            continuesLeft: startDay < weekStart,
            continuesRight: endDay > weekEnd,
          };
        });
      // 長いスパンを優先 → レーン上部に配置
      overlapping.sort((a, b) => {
        const lenA = a.endCol - a.startCol;
        const lenB = b.endCol - b.startCol;
        if (lenB !== lenA) return lenB - lenA;
        return a.startCol - b.startCol;
      });
      const lanes: number[] = [];
      return overlapping.map((seg) => {
        let lane = 0;
        while (lane < lanes.length && lanes[lane]! >= seg.startCol) lane++;
        lanes[lane] = seg.endCol;
        return { ...seg, lane };
      });
    });
  }, [weeks, normalized]);

  const itemsForDay = (day: Date) =>
    normalized
      .filter(({ startDay, endDay }) => day >= startDay && day <= endDay)
      .map(({ item }) => item);

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="p-2 text-center text-xs font-semibold">
            {w}
          </div>
        ))}
      </div>
      <div>
        {weeks.map((week, wi) => {
          const bars = weekBars[wi] ?? [];
          const visibleBars = bars.filter((b) => b.lane < VISIBLE_LANES);
          const overflowByDay = Array(7).fill(0) as number[];
          for (const b of bars) {
            if (b.lane >= VISIBLE_LANES) {
              for (let c = b.startCol; c <= b.endCol; c++) overflowByDay[c]! += 1;
            }
          }
          return (
            <div key={wi} className="relative grid grid-cols-7" style={{ minHeight: "6rem" }}>
              {week.map((d, di) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = isSameDay(d, today);
                return (
                  <button
                    key={di}
                    onClick={() => onDayClick(d, itemsForDay(d))}
                    className={`border-r border-b p-1 text-left hover:bg-muted/30 transition-colors ${
                      inMonth ? "" : "bg-muted/20 text-muted-foreground"
                    } ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div
                      className={`text-right text-xs ${isToday ? "font-bold text-primary" : ""}`}
                    >
                      {d.getDate()}
                    </div>
                  </button>
                );
              })}
              <div
                className="absolute inset-x-0 grid grid-cols-7 pointer-events-none gap-y-0.5 px-0.5"
                style={{ top: "1.5rem", gridAutoRows: "1rem" }}
              >
                {visibleBars.map((b) => (
                  <div
                    key={`${b.item.id}-${wi}`}
                    style={{
                      gridColumnStart: b.startCol + 1,
                      gridColumnEnd: b.endCol + 2,
                      gridRow: b.lane + 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      b.item.onClick?.();
                    }}
                    className={`truncate text-[10px] cursor-pointer pointer-events-auto px-1 ${
                      COLOR_CLASS[b.item.color]
                    } ${b.continuesLeft ? "rounded-l-none" : "rounded-l"} ${
                      b.continuesRight ? "rounded-r-none" : "rounded-r"
                    }`}
                  >
                    {b.continuesLeft
                      ? " "
                      : b.item.isAllDay
                        ? b.item.title
                        : `${new Date(b.item.startAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} ${b.item.title}`}
                  </div>
                ))}
                {overflowByDay.map((count, di) =>
                  count > 0 ? (
                    <div
                      key={`overflow-${wi}-${di}`}
                      style={{
                        gridColumnStart: di + 1,
                        gridColumnEnd: di + 2,
                        gridRow: VISIBLE_LANES + 1,
                      }}
                      className="text-[10px] text-muted-foreground px-1"
                    >
                      +{count}件
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
