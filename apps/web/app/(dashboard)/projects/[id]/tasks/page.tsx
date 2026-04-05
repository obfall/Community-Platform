"use client";

import { use, useState } from "react";
import { useProject, useProjectTasks, useCreateTask } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { filesApi, type UploadedFile } from "@/lib/api/files";
import type { ProjectTask, ProjectMember } from "@/lib/api/types";

export default function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: project } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const createTask = useCreateTask();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const members = project?.members ?? [];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRequestedDate("");
    setDueDate("");
    setSelectedAssignees([]);
    setUploadedFiles([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await filesApi.upload(file, "document", true);
        setUploadedFiles((prev) => [...prev, result]);
      }
    } catch {
      toast.error("ファイルのアップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleCreate = () => {
    createTask.mutate(
      {
        projectId,
        data: {
          title,
          description: description || undefined,
          requestedDate: requestedDate || undefined,
          dueDate: dueDate || undefined,
          assigneeIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
          fileIds: uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.id) : undefined,
        },
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      },
    );
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">タスク</h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              タスク追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>タスク追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>タイトル</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="タスク名"
                />
              </div>
              <div>
                <Label>概要</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                        checked={selectedAssignees.includes(m.userId)}
                        onCheckedChange={() => toggleAssignee(m.userId)}
                      />
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">{m.name.charAt(0)}</AvatarFallback>
                      </Avatar>
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
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>締切日</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedFiles.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
                      >
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="flex-1 truncate">{f.originalName}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setUploadedFiles((prev) => prev.filter((x) => x.id !== f.id))
                          }
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={handleCreate}
                disabled={!title || createTask.isPending || uploading}
                className="w-full"
              >
                追加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {!tasks?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">タスクがありません</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: ProjectTask) => (
            <Card key={t.id}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {t.requestedDate && <span>依頼: {t.requestedDate}</span>}
                      {t.dueDate && <span>期限: {t.dueDate}</span>}
                      {t.assignees.length > 0 && (
                        <span className="flex items-center gap-1">
                          担当:
                          {t.assignees.map((a) => (
                            <Badge key={a.id} variant="outline" className="text-[10px]">
                              {a.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{t.progress}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
