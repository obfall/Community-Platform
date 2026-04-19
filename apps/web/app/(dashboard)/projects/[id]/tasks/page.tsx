"use client";

import { use, useState, useCallback } from "react";
import {
  useProject,
  useProjectTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/projects/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/select-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Paperclip,
  X,
  Download,
  CheckCircle,
  Pencil,
  Trash2,
  MoreHorizontal,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { filesApi, type UploadedFile } from "@/lib/api/files";
import type {
  ProjectTask,
  ProjectMember,
  VideoTaskStatus,
  ProjectTaskAttachmentItem,
} from "@/lib/api/types";

const TASK_STATUS_OPTIONS: { value: VideoTaskStatus; label: string }[] = [
  { value: "not_started", label: "未着手" },
  { value: "in_progress", label: "進行中" },
  { value: "completed", label: "完了" },
];

const TASK_STATUS_LABEL: Record<VideoTaskStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  completed: "完了",
};

function statusBadgeVariant(status: VideoTaskStatus): "outline" | "secondary" | "default" {
  if (status === "completed") return "default";
  if (status === "in_progress") return "secondary";
  return "outline";
}

interface TaskFormState {
  title: string;
  description: string;
  requestedDate: string;
  dueDate: string;
  selectedAssignees: string[];
  existingAttachments: ProjectTaskAttachmentItem[];
  newFiles: UploadedFile[];
}

const EMPTY_FORM: TaskFormState = {
  title: "",
  description: "",
  requestedDate: "",
  dueDate: "",
  selectedAssignees: [],
  existingAttachments: [],
  newFiles: [],
};

export default function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTask | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const members = project?.members ?? [];
  const allTasksComplete =
    (tasks?.length ?? 0) > 0 && tasks?.every((t) => t.status === "completed");

  const patchForm = (patch: Partial<TaskFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await filesApi.upload(file, "document", true);
        patchForm({ newFiles: [...form.newFiles, result] });
      }
    } catch {
      toast.error("ファイルのアップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeExistingAttachment = (id: string) =>
    patchForm({ existingAttachments: form.existingAttachments.filter((a) => a.id !== id) });

  const removeNewFile = (fileId: string) =>
    patchForm({ newFiles: form.newFiles.filter((f) => f.id !== fileId) });

  const toggleAssignee = (userId: string) =>
    patchForm({
      selectedAssignees: form.selectedAssignees.includes(userId)
        ? form.selectedAssignees.filter((id) => id !== userId)
        : [...form.selectedAssignees, userId],
    });

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

  const handleChangeStatus = useCallback(
    (taskId: string, status: VideoTaskStatus) => {
      updateTask.mutate({ taskId, data: { status } });
    },
    [updateTask],
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTask.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const TaskForm = (
    <div className="space-y-4">
      <div>
        <Label>タイトル</Label>
        <Input
          value={form.title}
          onChange={(e) => patchForm({ title: e.target.value })}
          placeholder="タスク名"
        />
      </div>
      <div>
        <Label>概要</Label>
        <Textarea
          value={form.description}
          onChange={(e) => patchForm({ description: e.target.value })}
          rows={3}
          placeholder="タスクの詳細を入力"
        />
      </div>
      <div>
        <Label>担当者</Label>
        <div className="mt-1 max-h-40 space-y-2 overflow-y-auto rounded border p-2">
          {members.map((m: ProjectMember) => (
            <label key={m.userId} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.selectedAssignees.includes(m.userId)}
                onCheckedChange={() => toggleAssignee(m.userId)}
              />
              {m.name}
            </label>
          ))}
          {members.length === 0 && (
            <p className="text-xs text-muted-foreground">メンバーがいません</p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>依頼日</Label>
          <Input
            type="date"
            value={form.requestedDate}
            onChange={(e) => patchForm({ requestedDate: e.target.value })}
          />
        </div>
        <div>
          <Label>締切日</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => patchForm({ dueDate: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>ファイル添付</Label>
        <div className="mt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-colors hover:bg-accent">
            <Paperclip className="h-4 w-4" />
            {uploading ? "アップロード中..." : "ファイルを選択"}
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        {(form.existingAttachments.length > 0 || form.newFiles.length > 0) && (
          <div className="mt-2 space-y-1">
            {form.existingAttachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
              >
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{a.fileName}</span>
                <button type="button" onClick={() => removeExistingAttachment(a.id)}>
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ))}
            {form.newFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
              >
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{f.originalName}</span>
                <button type="button" onClick={() => removeNewFile(f.id)}>
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">タスク</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-3 w-3" />
          タスク追加
        </Button>
      </div>

      {/* 作成モーダル */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>タスク追加</DialogTitle>
          </DialogHeader>
          {TaskForm}
          <Button
            onClick={handleCreate}
            disabled={!form.title || createTask.isPending || uploading}
            className="w-full"
          >
            追加
          </Button>
        </DialogContent>
      </Dialog>

      {/* 編集モーダル */}
      <Dialog
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>タスク編集</DialogTitle>
          </DialogHeader>
          {TaskForm}
          <Button
            onClick={handleEdit}
            disabled={!form.title || updateTask.isPending || uploading}
            className="w-full"
          >
            保存
          </Button>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>タスクを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
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

      {!tasks?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">タスクがありません</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>タスク一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>タスク</TableHead>
                    <TableHead className="w-36">担当者</TableHead>
                    <TableHead className="w-28">依頼日</TableHead>
                    <TableHead className="w-28">締切日</TableHead>
                    <TableHead className="w-28">現在</TableHead>
                    <TableHead className="w-36">ステータス変更</TableHead>
                    <TableHead className="w-36">更新日</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task: ProjectTask, idx) => (
                    <TableRow key={task.id}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div
                          className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {task.description}
                          </div>
                        )}
                        {task.attachments.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {task.attachments.map((a) => (
                              <a
                                key={a.id}
                                href={a.fileUrl ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] hover:bg-accent"
                              >
                                <Download className="h-2.5 w-2.5 shrink-0" />
                                <span className="max-w-[120px] truncate">{a.fileName}</span>
                              </a>
                            ))}
                          </div>
                        )}
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
                        <Badge variant={statusBadgeVariant(task.status)} className="text-[10px]">
                          {TASK_STATUS_LABEL[task.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SelectField
                          value={task.status}
                          onChange={(v) => handleChangeStatus(task.id, v as VideoTaskStatus)}
                          options={TASK_STATUS_OPTIONS}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.updatedAt ? (
                          <>更新: {new Date(task.updatedAt).toLocaleDateString("ja-JP")}</>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
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
                              編集
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                createTask.mutate({
                                  projectId,
                                  data: {
                                    title: `${task.title}（コピー）`,
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
                              複製
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(task)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              削除
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
                <span className="text-sm font-medium">すべてのタスクを完了しました！</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
