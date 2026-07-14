"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMyTasks } from "@/hooks/profile/use-tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectField } from "@/components/select-field";
import { CheckSquare, Clock, FolderKanban, CalendarClock } from "lucide-react";
import type { MyTaskItem, VideoTaskStatus } from "@/lib/api/types";

const STATUS_OPTIONS: VideoTaskStatus[] = ["not_started", "in_progress", "completed"];

function statusVariant(status: VideoTaskStatus): "default" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "in_progress") return "secondary";
  return "outline";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfileTasksPage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("enums.videoTaskStatus");
  const [status, setStatus] = useState("all");
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyTasks(
    status === "all" ? undefined : status,
  );
  const [selected, setSelected] = useState<MyTaskItem | null>(null);

  const tasks = data?.pages.flatMap((p) => p.data) ?? [];
  const statusOptions = STATUS_OPTIONS.map((s) => ({ value: s, label: tStatus(s) }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("tasks.title")}</h2>

      <SelectField
        value={status}
        onChange={setStatus}
        options={statusOptions}
        includeAll
        className="w-44"
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>
      ) : tasks.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CheckSquare className="mx-auto mb-4 h-12 w-12" />
          <p>{t("tasks.empty")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tasks.map((task: MyTaskItem) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelected(task)}
                className="w-full text-left"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {task.project.name}
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t("tasks.due")}:{" "}
                              {new Date(task.dueDate).toLocaleDateString("ja-JP", {
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={statusVariant(task.status)} className="shrink-0 text-xs">
                        {tStatus.has(task.status) ? tStatus(task.status) : task.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? tCommon("loading") : tCommon("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}

      <TaskDetailDialog task={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TaskDetailDialog({ task, onClose }: { task: MyTaskItem | null; onClose: () => void }) {
  const t = useTranslations("profile.tasks.detail");
  const tStatus = useTranslations("enums.videoTaskStatus");

  if (!task) return null;

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{task.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p
              className={`text-base font-semibold ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
            >
              {task.title}
            </p>
            <Badge variant={statusVariant(task.status)} className="mt-1 text-xs">
              {tStatus.has(task.status) ? tStatus(task.status) : task.status}
            </Badge>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <FolderKanban className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-foreground">{task.project.name}</span>
            </div>
            {task.requestedDate && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-foreground">
                  {t("requestedDate")}: {formatDate(task.requestedDate)}
                </span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-foreground">
                  {t("dueDate")}: {formatDate(task.dueDate)}
                </span>
              </div>
            )}
            {task.description && (
              <div className="space-y-1 border-t pt-2">
                <dt className="text-muted-foreground">{t("description")}</dt>
                <dd className="rounded bg-muted p-2 text-sm whitespace-pre-wrap">
                  {task.description}
                </dd>
              </div>
            )}
          </dl>

          <Button asChild variant="outline" className="w-full">
            <Link href={`/projects/${task.project.id}/tasks`}>{t("viewTasks")}</Link>
          </Button>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
