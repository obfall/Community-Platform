"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useProject,
  useProjectTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/projects/use-projects";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, CheckCircle, Pencil, Trash2, MoreHorizontal, Copy } from "lucide-react";
import type { ProjectTask, VideoTaskStatus } from "@/lib/api/types";
import { TaskForm, EMPTY_TASK_FORM, type TaskFormState } from "./_components/task-form";
import { TASK_STATUS_VALUES, statusBadgeVariant } from "./_components/task-constants";

export default function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const t = useTranslations("projects");
  const tStatus = useTranslations("enums.videoTaskStatus");
  const { data: project } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTask | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [uploading, setUploading] = useState(false);

  const taskStatusOptions = TASK_STATUS_VALUES.map((value) => ({ value, label: tStatus(value) }));

  const members = project?.members ?? [];
  const totalCount = tasks?.length ?? 0;
  const completedCount = tasks?.filter((tk) => tk.status === "completed").length ?? 0;
  const inProgressCount = tasks?.filter((tk) => tk.status === "in_progress").length ?? 0;
  const notStartedCount = tasks?.filter((tk) => tk.status === "not_started").length ?? 0;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allTasksComplete = totalCount > 0 && completedCount === totalCount;

  const openCreate = () => {
    setForm(EMPTY_TASK_FORM);
    setCreateOpen(true);
  };

  const openEdit = (task: ProjectTask) => {
    setForm({
      title: task.title,
      description: task.description ?? "",
      requestedDate: task.requestedDate
        ? new Date(task.requestedDate).toISOString().slice(0, 10)
        : "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
      selectedAssignees: task.assignees.map((a) => a.userId),
      existingAttachments: task.attachments,
      newFiles: [],
    });
    setEditTask(task);
  };

  const handleCreate = () => {
    const fileIds = [
      ...form.existingAttachments.map((a) => a.fileId),
      ...form.newFiles.map((f) => f.id),
    ];
    createTask.mutate(
      {
        projectId,
        data: {
          title: form.title,
          description: form.description || undefined,
          requestedDate: form.requestedDate || undefined,
          dueDate: form.dueDate || undefined,
          assigneeIds: form.selectedAssignees.length > 0 ? form.selectedAssignees : undefined,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        },
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  };

  const handleEdit = () => {
    if (!editTask) return;
    const fileIds = [
      ...form.existingAttachments.map((a) => a.fileId),
      ...form.newFiles.map((f) => f.id),
    ];
    updateTask.mutate(
      {
        taskId: editTask.id,
        data: {
          title: form.title,
          description: form.description || undefined,
          requestedDate: form.requestedDate || null,
          dueDate: form.dueDate || null,
          assigneeIds: form.selectedAssignees,
          fileIds,
        },
      },
      { onSuccess: () => setEditTask(null) },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTask.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleChangeStatus = useCallback(
    (taskId: string, status: VideoTaskStatus) => {
      updateTask.mutate({ taskId, data: { status } });
    },
    [updateTask],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("tasks.title")}</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-3 w-3" />
          {t("tasks.addButton")}
        </Button>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("tasks.createDialogTitle")}</DialogTitle>
          </DialogHeader>
          <TaskForm
            form={form}
            setForm={setForm}
            members={members}
            uploading={uploading}
            setUploading={setUploading}
          />
          <Button
            onClick={handleCreate}
            disabled={!form.title || createTask.isPending || uploading}
            className="w-full"
          >
            {t("tasks.createSubmit")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("tasks.editDialogTitle")}</DialogTitle>
          </DialogHeader>
          <TaskForm
            form={form}
            setForm={setForm}
            members={members}
            uploading={uploading}
            setUploading={setUploading}
          />
          <Button
            onClick={handleEdit}
            disabled={!form.title || updateTask.isPending || uploading}
            className="w-full"
          >
            {t("tasks.saveSubmit")}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.deleteTaskTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.deleteTaskDescription", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!tasks?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("tasks.empty")}</p>
      ) : (
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <CardTitle>{t("tasks.summary.title")}</CardTitle>
              <span className="text-sm font-medium">
                {t("tasks.summary.completion", {
                  done: completedCount,
                  total: totalCount,
                  percent: completionPercent,
                })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusBadgeVariant("completed")} className="text-xs">
                {t("tasks.summary.completed", { count: completedCount })}
              </Badge>
              <Badge variant={statusBadgeVariant("in_progress")} className="text-xs">
                {t("tasks.summary.inProgress", { count: inProgressCount })}
              </Badge>
              <Badge variant={statusBadgeVariant("not_started")} className="text-xs">
                {t("tasks.summary.notStarted", { count: notStartedCount })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">{t("tasks.table.index")}</TableHead>
                    <TableHead>{t("tasks.table.title")}</TableHead>
                    <TableHead className="w-36">{t("tasks.table.assignees")}</TableHead>
                    <TableHead className="w-28">{t("tasks.table.requestedDate")}</TableHead>
                    <TableHead className="w-28">{t("tasks.table.dueDate")}</TableHead>
                    <TableHead className="w-36">{t("tasks.table.status")}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task: ProjectTask, idx) => (
                    <TableRow key={task.id}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Link
                          href={`/projects/${projectId}/tasks/${task.id}`}
                          className={`text-sm font-medium hover:underline ${
                            task.status === "completed" ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {task.assignees.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.assignees.map((a) => (
                              <Badge key={a.id} variant="outline" className="text-[10px]">
                                {a.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.requestedDate ? (
                          new Date(task.requestedDate).toLocaleDateString("ja-JP")
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.dueDate ? (
                          new Date(task.dueDate).toLocaleDateString("ja-JP")
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <SelectField
                          value={task.status}
                          onChange={(v) => handleChangeStatus(task.id, v as VideoTaskStatus)}
                          options={taskStatusOptions}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(task)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              {t("tasks.menu.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                createTask.mutate({
                                  projectId,
                                  data: {
                                    title: `${task.title}${t("tasks.duplicatedTitleSuffix")}`,
                                    description: task.description ?? undefined,
                                    requestedDate: task.requestedDate
                                      ? new Date(task.requestedDate).toISOString().slice(0, 10)
                                      : undefined,
                                    dueDate: task.dueDate
                                      ? new Date(task.dueDate).toISOString().slice(0, 10)
                                      : undefined,
                                    assigneeIds: task.assignees.map((a) => a.userId),
                                    fileIds: task.attachments.map((a) => a.fileId),
                                  },
                                })
                              }
                            >
                              <Copy className="mr-2 h-3.5 w-3.5" />
                              {t("tasks.duplicate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(task)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              {t("tasks.menu.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {allTasksComplete && (
              <div className="mt-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700 dark:bg-green-950 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{t("tasks.summary.allDone")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
