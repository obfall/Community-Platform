"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from "@/hooks/calendar/use-calendar";
import { useAllMyReservations } from "@/hooks/profile/use-reservations";
import { useAllMyTasks } from "@/hooks/profile/use-tasks";
import { useAllMyTickets } from "@/hooks/profile/use-tickets";
import { useMyProjectSchedules } from "@/hooks/profile/use-project-calendar";
import { useSkillBookings } from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
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
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user } = useAuth();
  const { data: schedules } = useSchedules();
  const { data: reservations } = useAllMyReservations();
  const { data: tasks } = useAllMyTasks();
  const { data: tickets } = useAllMyTickets();
  const { data: projectSchedules } = useMyProjectSchedules();
  const { data: skillBookings } = useSkillBookings();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [showSchedules, setShowSchedules] = useState(true);
  const [showReservations, setShowReservations] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showTickets, setShowTickets] = useState(true);
  const [showProjectSchedules, setShowProjectSchedules] = useState(true);

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

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
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

    const skillBookingItems: CalendarItem[] = showReservations
      ? (skillBookings ?? [])
          .filter(
            (b) =>
              b.status === "approved" &&
              !!b.scheduledAt &&
              (b.providerUserId === user?.id || b.requesterUserId === user?.id),
          )
          .map((b) => {
            const start = new Date(b.scheduledAt!);
            const end = new Date(start.getTime() + b.skillListing.durationMinutes * 60_000);
            return {
              id: `skill-booking-${b.id}`,
              title: b.skillListing.title,
              startAt: start.toISOString(),
              endAt: end.toISOString(),
              isAllDay: false,
              color: "green" as const,
              onClick: () => router.push(`/skills/bookings/${b.id}`),
            };
          })
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

    const projectScheduleItems: CalendarItem[] = showProjectSchedules
      ? (projectSchedules ?? []).map((s) => ({
          id: `project-schedule-${s.id}`,
          title: `【${s.project.name}】${s.title}`,
          startAt: s.startAt,
          endAt: s.endAt,
          isAllDay: s.isAllDay,
          color: "purple" as const,
          onClick: () => router.push(`/projects/${s.project.id}/schedule`),
        }))
      : [];

    return [
      ...scheduleItems,
      ...reservationItems,
      ...skillBookingItems,
      ...taskItems,
      ...ticketItems,
      ...projectScheduleItems,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    schedules,
    reservations,
    skillBookings,
    user?.id,
    tasks,
    tickets,
    projectSchedules,
    showSchedules,
    showReservations,
    showTasks,
    showTickets,
    showProjectSchedules,
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
      updateSchedule.mutate({ id: editingId, data: payload }, { onSuccess: () => closeDialog() });
    } else {
      createSchedule.mutate(payload, { onSuccess: () => closeDialog() });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t("calendar.deleteConfirm"))) deleteSchedule.mutate(id);
  };

  const scheduleMap = new Map((schedules ?? []).map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("calendar.title")}</h1>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showSchedules}
              onCheckedChange={(v) => setShowSchedules(!!v)}
              className="border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            />
            {t("calendar.filters.schedules")}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showReservations}
              onCheckedChange={(v) => setShowReservations(!!v)}
              className="border-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
            {t("calendar.filters.reservations")}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showTasks}
              onCheckedChange={(v) => setShowTasks(!!v)}
              className="border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            {t("calendar.filters.tasks")}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showTickets}
              onCheckedChange={(v) => setShowTickets(!!v)}
              className="border-gray-400 data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400"
            />
            {t("calendar.filters.tickets")}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showProjectSchedules}
              onCheckedChange={(v) => setShowProjectSchedules(!!v)}
              className="border-purple-400 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
            />
            {t("calendar.filters.projectSchedules")}
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
                t("calendar.dialogDate", {
                  year: selectedDay.getFullYear(),
                  month: selectedDay.getMonth() + 1,
                  day: selectedDay.getDate(),
                })}
            </DialogTitle>
          </DialogHeader>

          {!showForm ? (
            <>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selectedDayItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("calendar.empty")}</p>
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
                                ? t("calendar.allDay")
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
                  {t("calendar.addSchedule")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Label>{t("calendar.form.title")}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>{t("calendar.form.description")}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>{t("calendar.form.start")}</Label>
                    <Input
                      type="datetime-local"
                      value={startAtStr}
                      onChange={(e) => setStartAtStr(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{t("calendar.form.end")}</Label>
                    <Input
                      type="datetime-local"
                      value={endAtStr}
                      onChange={(e) => setEndAtStr(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("calendar.form.location")}</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  {tCommon("cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!title || !startAtStr || !endAtStr || createSchedule.isPending}
                >
                  {tCommon("save")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
