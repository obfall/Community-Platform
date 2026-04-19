"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from "@/hooks/calendar/use-calendar";
import { useMyReservations, useMyTasks, useMyTickets } from "@/hooks/members/use-members";
import { Calendar, type CalendarItem } from "@/components/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, MapPin } from "lucide-react";
import type { Schedule } from "@/lib/api/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDateTimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ProfileCalendarPage() {
  const router = useRouter();
  const { data: schedules } = useSchedules();
  const { data: reservations } = useMyReservations();
  const { data: tasks } = useMyTasks();
  const { data: tickets } = useMyTickets();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [showSchedules, setShowSchedules] = useState(true);
  const [showReservations, setShowReservations] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showTickets, setShowTickets] = useState(true);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayItems, setSelectedDayItems] = useState<CalendarItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
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

  const calendarItems = useMemo<CalendarItem[]>(() => {
    const scheduleItems: CalendarItem[] = showSchedules
      ? (schedules ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          startAt: s.startAt,
          endAt: s.endAt,
          isAllDay: s.isAllDay,
          color: "blue" as const,
          onClick: () => openEditForm(s),
        }))
      : [];

    const reservationItems: CalendarItem[] = showReservations
      ? (reservations ?? []).map((r) => ({
          id: `reservation-${r.id}`,
          title: r.title ?? r.space.name,
          startAt: r.startAt,
          endAt: r.endAt,
          isAllDay: false,
          color: "green" as const,
          onClick: () => router.push("/profile/reservations"),
        }))
      : [];

    const taskItems: CalendarItem[] = showTasks
      ? (tasks ?? [])
          .filter((t) => !!t.dueDate)
          .map((t) => {
            const dateStr = new Date(t.dueDate!).toISOString().slice(0, 10);
            return {
              id: `task-${t.id}`,
              title: t.title,
              startAt: `${dateStr}T00:00:00`,
              endAt: `${dateStr}T23:59:59`,
              isAllDay: true,
              color: "orange" as const,
              onClick: () => router.push(`/projects/${t.project.id}/tasks`),
            };
          })
      : [];

    const ticketItems: CalendarItem[] = showTickets
      ? (tickets ?? [])
          .filter((t) => t.event.status !== "canceled")
          .map((t) => ({
            id: `ticket-${t.id}`,
            title: t.event.title,
            startAt: t.event.startAt,
            endAt: t.event.endAt,
            isAllDay: false,
            color: "gray" as const,
            onClick: () => router.push(`/events/${t.event.id}`),
          }))
      : [];

    return [...scheduleItems, ...reservationItems, ...taskItems, ...ticketItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    schedules,
    reservations,
    tasks,
    tickets,
    showSchedules,
    showReservations,
    showTasks,
    showTickets,
  ]);

  const handleDayClick = useCallback((date: Date, items: CalendarItem[]) => {
    setSelectedDay(date);
    setSelectedDayItems(items);
    setDialogOpen(true);
    resetForm();
  }, []);

  const openCreateForm = () => {
    if (!selectedDay) return;
    const ymd = fmtDate(selectedDay);
    setStartAtStr(`${ymd}T09:00`);
    setEndAtStr(`${ymd}T10:00`);
    setShowForm(true);
  };

  const openEditForm = (s: Schedule) => {
    setEditingId(s.id);
    setTitle(s.title);
    setDescription(s.description ?? "");
    setIsAllDay(s.isAllDay);
    setLocation(s.location ?? "");
    setStartAtStr(fmtDateTimeLocal(new Date(s.startAt)));
    setEndAtStr(fmtDateTimeLocal(new Date(s.endAt)));
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
    if (confirm("削除しますか?")) deleteSchedule.mutate(id);
  };

  const scheduleMap = new Map((schedules ?? []).map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">カレンダー</h1>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showSchedules}
              onCheckedChange={(v) => setShowSchedules(!!v)}
              className="border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            />
            予定
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showReservations}
              onCheckedChange={(v) => setShowReservations(!!v)}
              className="border-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
            マイ予約
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showTasks}
              onCheckedChange={(v) => setShowTasks(!!v)}
              className="border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            マイタスク
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showTickets}
              onCheckedChange={(v) => setShowTickets(!!v)}
              className="border-gray-400 data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400"
            />
            マイチケット
          </label>
        </div>
      </div>

      <Calendar items={calendarItems} onDayClick={handleDayClick} />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay &&
                `${selectedDay.getFullYear()}年${selectedDay.getMonth() + 1}月${selectedDay.getDate()}日`}
            </DialogTitle>
          </DialogHeader>

          {!showForm ? (
            <>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selectedDayItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">予定はありません</p>
                ) : (
                  selectedDayItems.map((item) => {
                    const s = scheduleMap.get(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`rounded border p-3 text-sm ${s ? "cursor-pointer hover:bg-muted/30" : ""} ${
                          item.color === "green"
                            ? "border-green-200 bg-green-50/50"
                            : item.color === "orange"
                              ? "border-orange-200 bg-orange-50/50"
                              : "border-blue-200 bg-blue-50/50"
                        }`}
                        onClick={() => {
                          if (s) openEditForm(s);
                          item.onClick?.();
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{item.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.isAllDay
                                ? "終日"
                                : `${new Date(item.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} - ${new Date(item.endAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
                            </div>
                            {s?.location && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {s.location}
                              </div>
                            )}
                          </div>
                          {s && (
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
                          )}
                        </div>
                      </div>
                    );
                  })
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
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
