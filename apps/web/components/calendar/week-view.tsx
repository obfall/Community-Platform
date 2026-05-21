"use client";

import { useMemo } from "react";
import type { CalendarItem } from "./types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MS_PER_DAY = 86400000;

const COLOR_CLASS: Record<CalendarItem["color"], string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300",
  orange:
    "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300",
  green: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300",
  gray: "bg-muted text-muted-foreground border-border",
  purple:
    "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300",
};

function startOfWeek(d: Date) {
  const result = new Date(d);
  result.setDate(d.getDate() - d.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

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

export function WeekView({ cursor, items, onDayClick }: Props) {
  const today = new Date();
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + 6);
    return d;
  }, [weekStart]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const normalized = useMemo(
    () =>
      items.map((item) => ({
        item,
        startDay: startOfDay(new Date(item.startAt)),
        endDay: startOfDay(new Date(item.endAt)),
      })),
    [items],
  );

  // バー行: 終日 or 複数日にまたがるアイテム
  const spanningBars = useMemo(() => {
    const overlapping = normalized
      .filter(({ item, startDay, endDay }) => {
        const isMultiDay = startDay.getTime() !== endDay.getTime();
        if (!item.isAllDay && !isMultiDay) return false;
        return endDay >= weekStart && startDay <= weekEnd;
      })
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
  }, [normalized, weekStart, weekEnd]);

  // 時間グリッド: 単日タイムドのみ
  const timedItems = useMemo(
    () =>
      normalized
        .filter(
          ({ item, startDay, endDay }) => !item.isAllDay && startDay.getTime() === endDay.getTime(),
        )
        .map(({ item }) => item),
    [normalized],
  );

  const timedForDay = (day: Date) =>
    timedItems.filter((item) => isSameDay(new Date(item.startAt), day));

  const itemsForDay = (day: Date) =>
    normalized
      .filter(({ startDay, endDay }) => day >= startDay && day <= endDay)
      .map(({ item }) => item);

  const CELL_HEIGHT = 48; // px per hour

  function topPx(date: Date) {
    return (date.getHours() + date.getMinutes() / 60) * CELL_HEIGHT;
  }

  function heightPx(start: Date, end: Date) {
    const diff = (end.getTime() - start.getTime()) / 3600000;
    return Math.max(diff * CELL_HEIGHT, 20);
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* ヘッダー */}
      <div
        className="grid border-b bg-muted/50"
        style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
      >
        <div className="border-r" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <button
              key={i}
              onClick={() => onDayClick(d, itemsForDay(d))}
              className={`p-2 text-center text-xs font-semibold hover:bg-muted/30 ${isToday ? "text-primary" : ""}`}
            >
              <div>{WEEKDAYS[d.getDay()]}</div>
              <div
                className={`text-base font-bold ${isToday ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto" : ""}`}
              >
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      {/* 終日・複数日バー行 */}
      {spanningBars.length > 0 && (
        <div className="grid border-b" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          <div className="border-r p-1 text-[10px] text-muted-foreground text-right pr-1">終日</div>
          <div
            className="col-span-7 grid grid-cols-7 gap-y-0.5 px-0.5 py-1"
            style={{ gridAutoRows: "1.125rem" }}
          >
            {spanningBars.map((b) => (
              <div
                key={b.item.id}
                style={{
                  gridColumnStart: b.startCol + 1,
                  gridColumnEnd: b.endCol + 2,
                  gridRow: b.lane + 1,
                }}
                onClick={() => b.item.onClick?.()}
                className={`truncate text-[10px] cursor-pointer px-1 ${COLOR_CLASS[b.item.color]} ${
                  b.continuesLeft ? "rounded-l-none" : "rounded-l"
                } ${b.continuesRight ? "rounded-r-none" : "rounded-r"}`}
              >
                {b.continuesLeft ? " " : b.item.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 時間軸 */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div className="relative grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          {/* 時間ラベル列 */}
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: CELL_HEIGHT }}
                className="border-r border-b flex items-start pt-1 pr-1 justify-end"
              >
                <span className="text-[10px] text-muted-foreground">{h}:00</span>
              </div>
            ))}
          </div>

          {/* 各日列 */}
          {days.map((d, di) => {
            const dayItems = timedForDay(d);
            const isToday = isSameDay(d, today);
            return (
              <div key={di} className="relative border-r">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: CELL_HEIGHT }}
                    className={`border-b ${isToday ? "bg-primary/3" : ""}`}
                  />
                ))}
                {dayItems.map((item) => {
                  const start = new Date(item.startAt);
                  const end = new Date(item.endAt);
                  return (
                    <div
                      key={item.id}
                      onClick={() => item.onClick?.()}
                      style={{ top: topPx(start), height: heightPx(start, end) }}
                      className={`absolute inset-x-0.5 rounded border-l-2 px-1 text-[10px] cursor-pointer overflow-hidden ${COLOR_CLASS[item.color]}`}
                    >
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="opacity-70">
                        {start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
