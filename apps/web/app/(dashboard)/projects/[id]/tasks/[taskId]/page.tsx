"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useProject,
  useProjectTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/projects/use-projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { ArrowLeft, Pencil, Trash2, Copy, MoreVertical, Download, Paperclip } from "lucide-react";
import type { ProjectTask } from "@/lib/api/types";
import { TaskForm, EMPTY_TASK_FORM, type TaskFormState } from "../_components/task-form";
import { statusBadgeVariant } from "../_components/task-constants";

export default function ProjectTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = use(params);
  const router = useRouter();
  const t = useTranslations("projects");
  const tStatus = useTranslations("enums.videoTaskStatus");
  const { data: project } = useProject(projectId);
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const task = tasks?.find((tk) => tk.id === taskId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [uploading, setUploading] = useState(false);

  const members = project?.members ?? [];
  const backHref = `/projects/${projectId}/tasks`;

  const openEdit = () => {
    if (!task) return;
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
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!task) return;
    const fileIds = [
      ...form.existingAttachments.map((a) => a.fileId),
      ...form.newFiles.map((f) => f.id),
    ];
    updateTask.mutate(
      {
        taskId: task.id,
        data: {
          title: form.title,
          description: form.description || undefined,
          requestedDate: form.requestedDate || null,
          dueDate: form.dueDate || null,
          assigneeIds: form.selectedAssignees,
          fileIds,
        },
      },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  const handleDuplicate = (tk: ProjectTask) => {
    createTask.mutate(
      {
        projectId,
        data: {
          title: `${tk.title}${t("tasks.duplicatedTitleSuffix")}`,
          description: tk.description ?? undefined,
          requestedDate: tk.requestedDate
            ? new Date(tk.requestedDate).toISOString().slice(0, 10)
            : undefined,
          dueDate: tk.dueDate ? new Date(tk.dueDate).toISOString().slice(0, 10) : undefined,
          assigneeIds: tk.assignees.map((a) => a.userId),
          fileIds: tk.attachments.map((a) => a.fileId),
        },
      },
      { onSuccess: () => router.push(backHref) },
    );
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => router.push(backHref),
    });
  };

  if (isLoading) {
    return <div className="h-60 animate-pulse rounded-lg bg-muted" />;
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("tasks.detail.back")}
          </Link>
        </Button>
        <div className="flex h-60 items-center justify-center text-muted-foreground">
          {t("tasks.detail.notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("tasks.detail.back")}
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <Badge variant={statusBadgeVariant(task.status)}>{tStatus(task.status)}</Badge>
          <h1
            className={`text-2xl font-bold ${
              task.status === "completed" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              {t("tasks.menu.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(task)}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              {t("tasks.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {t("tasks.menu.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {task.description && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {t("tasks.detail.descriptionLabel")}
              </div>
              <p className="whitespace-pre-wrap text-sm">{task.description}</p>
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              {t("tasks.detail.assigneesLabel")}
            </div>
            {task.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {task.assignees.map((a) => (
                  <Badge key={a.id} variant="outline">
                    {a.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground/60">—</span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {t("tasks.detail.requestedDateLabel")}
              </div>
              <p className="text-sm">
                {task.requestedDate ? (
                  new Date(task.requestedDate).toLocaleDateString("ja-JP")
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </p>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {t("tasks.detail.dueDateLabel")}
              </div>
              <p className="text-sm">
                {task.dueDate ? (
                  new Date(task.dueDate).toLocaleDateString("ja-JP")
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </p>
            </div>
          </div>

          {task.attachments.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {t("tasks.detail.attachmentsLabel")}
              </div>
              <div className="flex flex-wrap gap-2">
                {task.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.fileUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs hover:bg-accent"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="max-w-[200px] truncate">{a.fileName}</span>
                    <Download className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
            <div>{t("tasks.detail.createdBy", { name: task.createdBy.name })}</div>
            <div>
              {t("tasks.detail.createdAt", {
                date: new Date(task.createdAt).toLocaleDateString("ja-JP"),
              })}
            </div>
            <div>
              {t("tasks.detail.updatedAt", {
                date: new Date(task.updatedAt).toLocaleDateString("ja-JP"),
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false);
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
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.deleteTaskTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm.deleteTaskDescription", { title: task.title })}
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
    </div>
  );
}
