"use client";

import { useMemo, useState } from "react";
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from "@/hooks/use-schedules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { Schedule } from "@/lib/api/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  // Build 7x6 grid starting from Sunday of week containing monthStart
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const days: Date[] = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      arr.push(d);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.getFullYear(), cursor.getMonth()]);

  const startAt = new Date(monthStart);
  const endAt = new Date(monthEnd);
  endAt.setHours(23, 59, 59);

  const { data } = useSchedules({
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  });

  const schedulesByDay = useMemo(() => {
    const list = data ?? [];
    const map = new Map<string, Schedule[]>();
    for (const s of list) {
      const key = fmtDate(new Date(s.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [data]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAtStr, setStartAtStr] = useState("");
  const [endAtStr, setEndAtStr] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStartAtStr("");
    setEndAtStr("");
    setIsAllDay(false);
    setLocation("");
    setShowForm(false);
  };

  const openDay = (d: Date) => {
    setSelectedDay(d);
    setDialogOpen(true);
    resetForm();
  };

  const openCreateForm = () => {
    if (!selectedDay) return;
    const ymd = fmtDate(selectedDay);
    setStartAtStr(`${ymd}T09:00`);
    setEndAtStr(`${ymd}T10:00`);
    setShowForm(true);
  };

  const openEditForm = (s: Schedule) => {
    const start = new Date(s.startAt);
    const end = new Date(s.endAt);
    setEditingId(s.id);
    setTitle(s.title);
    setDescription(s.description ?? "");
    setIsAllDay(s.isAllDay);
    setLocation(s.location ?? "");
    setStartAtStr(
      `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
    );
    setEndAtStr(
      `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
    );
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      title,
      description: description || undefined,
      startAt: new Date(startAtStr).toISOString(),
      endAt: new Date(endAtStr).toISOString(),
      isAllDay,
      location: location || undefined,
    };
    if (editingId) {
      updateSchedule.mutate({ id: editingId, data: payload }, { onSuccess: () => resetForm() });
    } else {
      createSchedule.mutate(payload, { onSuccess: () => resetForm() });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("削除しますか?")) {
      deleteSchedule.mutate(id);
    }
  };

  const today = new Date();
  const selectedDaySchedules = selectedDay ? (schedulesByDay.get(fmtDate(selectedDay)) ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">カレンダー</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center font-semibold">
            {cursor.getFullYear()}年 {cursor.getMonth() + 1}月
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCursor(new Date())}>
            今日
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
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
            const dayItems = schedulesByDay.get(fmtDate(d)) ?? [];
            return (
              <button
                key={i}
                onClick={() => openDay(d)}
                className={`min-h-24 border-r border-b p-1 text-left text-xs hover:bg-muted/30 ${
                  inMonth ? "" : "bg-muted/20 text-muted-foreground"
                } ${isToday ? "bg-primary/5" : ""}`}
              >
                <div className={`mb-1 text-right ${isToday ? "font-bold text-primary" : ""}`}>
                  {d.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      className="truncate rounded bg-primary/10 px-1 text-[10px] text-primary"
                    >
                      {s.title}
                    </div>
                  ))}
                  {dayItems.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayItems.length - 2}件
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay &&
                `${selectedDay.getFullYear()}年${selectedDay.getMonth() + 1}月${selectedDay.getDate()}日`}
            </DialogTitle>
          </DialogHeader>

          {!showForm ? (
            <>
              <div className="space-y-2">
                {selectedDaySchedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">予定はありません</p>
                ) : (
                  selectedDaySchedules.map((s) => (
                    <div
                      key={s.id}
                      className="rounded border p-3 text-sm"
                      onClick={() => openEditForm(s)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{s.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.isAllDay
                              ? "終日"
                              : `${new Date(s.startAt).toLocaleTimeString("ja-JP", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })} - ${new Date(s.endAt).toLocaleTimeString("ja-JP", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`}
                          </div>
                          {s.location && (
                            <div className="text-xs text-muted-foreground">📍 {s.location}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button onClick={openCreateForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  予定を追加
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Label>タイトル</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                </div>
                <div>
                  <Label>説明</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>開始</Label>
                    <Input
                      type="datetime-local"
                      value={startAtStr}
                      onChange={(e) => setStartAtStr(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>終了</Label>
                    <Input
                      type="datetime-local"
                      value={endAtStr}
                      onChange={(e) => setEndAtStr(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>場所</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!title || !startAtStr || !endAtStr || createSchedule.isPending}
                >
                  保存
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
