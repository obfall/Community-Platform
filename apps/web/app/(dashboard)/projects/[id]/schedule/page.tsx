"use client";

import { use, useState, useCallback } from "react";
import {
  useProject,
  useProjectTasks,
  useProjectSchedules,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useDeleteProjectSchedule,
} from "@/hooks/projects/use-projects";
import { useEvent } from "@/hooks/events/use-events";
import { useAuth } from "@/hooks/auth/use-auth";
import { Calendar, type CalendarItem } from "@/components/calendar";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, MapPin } from "lucide-react";
import type { ProjectScheduleItem, ProjectTask } from "@/lib/api/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDateTimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ProjectSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const { data: schedules } = useProjectSchedules(projectId);
  const { data: relatedEvent } = useEvent(project?.event?.id);
  const createSchedule = useCreateProjectSchedule(projectId);
  const updateSchedule = useUpdateProjectSchedule(projectId);
  const deleteSchedule = useDeleteProjectSchedule(projectId);

  const router = useRouter();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const [showSchedules, setShowSchedules] = useState(true);
  const [showMyTasks, setShowMyTasks] = useState(true);
  const [showOtherTasks, setShowOtherTasks] = useState(true);
  const [showEvent, setShowEvent] = useState(true);

  // ダイアログ状態
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayItems, setSelectedDayItems] = useState<CalendarItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProjectScheduleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectScheduleItem | null>(null);

  // フォーム状態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAtStr, setStartAtStr] = useState("");
  const [endAtStr, setEndAtStr] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartAtStr("");
    setEndAtStr("");
    setIsAllDay(false);
    setLocation("");
    setEditingSchedule(null);
    setShowForm(false);
  };

  // CalendarItem に変換（React Compiler が自動メモ化するため useMemo 不要）
  const scheduleCalendarItems: CalendarItem[] = showSchedules
    ? (schedules ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        startAt: s.startAt,
        endAt: s.endAt,
        isAllDay: s.isAllDay,
        color: "blue" as const,
        onClick: isAdmin ? () => openEditForm(s) : undefined,
      }))
    : [];

  const taskCalendarItems: CalendarItem[] = (tasks ?? [])
    .filter((t): t is ProjectTask & { dueDate: string } => !!t.dueDate)
    .map((t) => {
      const dateStr = new Date(t.dueDate).toISOString().slice(0, 10);
      const isMine = t.assignees.some((a) => a.userId === user?.id);
      if (isMine && !showMyTasks) return null;
      if (!isMine && !showOtherTasks) return null;
      return {
        id: `task-${t.id}`,
        title: isMine ? `★ ${t.title}` : t.title,
        startAt: `${dateStr}T00:00:00`,
        endAt: `${dateStr}T23:59:59`,
        isAllDay: true,
        color: isMine ? ("orange" as const) : ("gray" as const),
        onClick: () => router.push(`/projects/${projectId}/tasks`),
      };
    })
    .filter((t) => t !== null) as CalendarItem[];

  const eventCalendarItems: CalendarItem[] =
    showEvent && relatedEvent
      ? [
          {
            id: `event-${relatedEvent.id}`,
            title: relatedEvent.title,
            startAt: relatedEvent.startAt,
            endAt: relatedEvent.endAt,
            isAllDay: false,
            color: "green" as const,
            onClick: () => router.push(`/events/${relatedEvent.id}`),
          },
        ]
      : [];

  const calendarItems: CalendarItem[] = [
    ...scheduleCalendarItems,
    ...taskCalendarItems,
    ...eventCalendarItems,
  ];

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

  const openEditForm = (s: ProjectScheduleItem) => {
    setEditingSchedule(s);
    setTitle(s.title);
    setDescription(s.description ?? "");
    setIsAllDay(s.isAllDay);
    setLocation(s.location ?? "");
    setStartAtStr(fmtDateTimeLocal(new Date(s.startAt)));
    setEndAtStr(fmtDateTimeLocal(new Date(s.endAt)));
    setSelectedDay(new Date(s.startAt));
    setDialogOpen(true);
    setShowForm(true);
  };

  const handleSave = () => {
    const data = {
      title,
      description: description || undefined,
      startAt: new Date(startAtStr).toISOString(),
      endAt: new Date(endAtStr).toISOString(),
      isAllDay,
      location: location || undefined,
    };
    if (editingSchedule) {
      updateSchedule.mutate(
        { scheduleId: editingSchedule.id, data },
        {
          onSuccess: () => {
            resetForm();
            setDialogOpen(false);
          },
        },
      );
    } else {
      createSchedule.mutate(data, { onSuccess: () => resetForm() });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSchedule.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setDialogOpen(false);
      },
    });
  };

  const scheduleMap = new Map((schedules ?? []).map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">スケジュール</h2>
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
              checked={showMyTasks}
              onCheckedChange={(v) => setShowMyTasks(!!v)}
              className="border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            マイタスク
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showOtherTasks}
              onCheckedChange={(v) => setShowOtherTasks(!!v)}
              className="border-gray-400 data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400"
            />
            タスク
          </label>
          {relatedEvent && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={showEvent}
                onCheckedChange={(v) => setShowEvent(!!v)}
                className="border-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              イベント
            </label>
          )}
        </div>
      </div>

      <Calendar items={calendarItems} onDayClick={handleDayClick} />

      {/* 日付ダイアログ */}
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
                    const schedule = !item.id.startsWith("task-") ? scheduleMap.get(item.id) : null;
                    return (
                      <div
                        key={item.id}
                        className={`rounded border p-3 text-sm ${item.color === "orange" ? "border-orange-200 bg-orange-50/50" : "border-blue-200 bg-blue-50/50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">
                              {item.id.startsWith("task-") ? item.title : item.title}
                            </div>
                            {schedule && (
                              <>
                                <div className="text-xs text-muted-foreground">
                                  {schedule.isAllDay
                                    ? "終日"
                                    : `${new Date(schedule.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} - ${new Date(schedule.endAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
                                </div>
                                {schedule.location && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {schedule.location}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {isAdmin && schedule && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEditForm(schedule)}
                              >
                                <span className="text-xs">編集</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setDeleteTarget(schedule)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {isAdmin && (
                <DialogFooter>
                  <Button onClick={openCreateForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    予定を追加
                  </Button>
                </DialogFooter>
              )}
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
                    rows={2}
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
                  disabled={
                    !title ||
                    !startAtStr ||
                    !endAtStr ||
                    createSchedule.isPending ||
                    updateSchedule.isPending
                  }
                >
                  保存
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>予定を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>「{deleteTarget?.title}」を削除します。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
