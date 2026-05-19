"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, ArrowUp, ArrowDown, Paperclip, Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { filesApi } from "@/lib/api/files";
import type { TaskInput } from "@/lib/api/types";

interface TaskEditorState extends TaskInput {
  uploadedFileNames?: Record<string, string>;
}

interface Props {
  value: TaskInput[];
  onChange: (tasks: TaskInput[]) => void;
}

export function TaskListEditor({ value, onChange }: Props) {
  const t = useTranslations("videos.taskListEditor");
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addTask = () => {
    onChange([...value, { title: "", sortOrder: value.length }]);
  };

  const updateTask = (index: number, patch: Partial<TaskEditorState>) => {
    onChange(value.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const removeTask = (index: number) => {
    onChange(value.filter((_, i) => i !== index).map((t, i) => ({ ...t, sortOrder: i })));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const temp = next[index - 1]!;
    next[index - 1] = next[index]!;
    next[index] = temp;
    onChange(next.map((t, i) => ({ ...t, sortOrder: i })));
  };

  const duplicateTask = (index: number) => {
    const src = value[index]!;
    const copy: TaskInput = {
      title: `${src.title}${t("duplicateSuffix")}`,
      description: src.description,
      sortOrder: value.length,
      fileIds: src.fileIds ? [...src.fileIds] : undefined,
    };
    onChange([...value, copy]);
  };

  const moveDown = (index: number) => {
    if (index >= value.length - 1) return;
    const next = [...value];
    const temp = next[index]!;
    next[index] = next[index + 1]!;
    next[index + 1] = temp;
    onChange(next.map((t, i) => ({ ...t, sortOrder: i })));
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((f) => filesApi.upload(f, "document", true)),
      );
      const task = value[index]!;
      const existingIds = task.fileIds ?? [];
      const existingNames: Record<string, string> =
        (task as TaskEditorState).uploadedFileNames ?? {};
      const newNames: Record<string, string> = {};
      uploaded.forEach((u) => {
        newNames[u.id] = u.originalName;
      });
      updateTask(index, {
        fileIds: [...existingIds, ...uploaded.map((u) => u.id)],
        uploadedFileNames: { ...existingNames, ...newNames },
      } as Partial<TaskEditorState>);
    } catch {
      toast.error(t("uploadErrorToast"));
    } finally {
      e.target.value = "";
    }
  };

  const removeFile = (taskIndex: number, fileId: string) => {
    const task = value[taskIndex]!;
    const names = { ...((task as TaskEditorState).uploadedFileNames ?? {}) };
    delete names[fileId];
    updateTask(taskIndex, {
      fileIds: (task.fileIds ?? []).filter((id) => id !== fileId),
      uploadedFileNames: names,
    } as Partial<TaskEditorState>);
  };

  return (
    <div className="space-y-3">
      <Label>{t("label")}</Label>
      {value.map((task, idx) => {
        const state = task as TaskEditorState;
        const fileNames = state.uploadedFileNames ?? {};
        return (
          <div key={task.id ?? `new-${idx}`} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder={t("titlePlaceholder")}
                  value={task.title}
                  onChange={(e) => updateTask(idx, { title: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => moveDown(idx)}
                  disabled={idx >= value.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-xs">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicateTask(idx)}>
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      {t("duplicateAction")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => removeTask(idx)}
                    >
                      <X className="mr-2 h-3.5 w-3.5" />
                      {t("removeAction")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <Input
              placeholder={t("descriptionPlaceholder")}
              value={task.description ?? ""}
              onChange={(e) => updateTask(idx, { description: e.target.value || undefined })}
            />
            <div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors hover:bg-accent">
                <Paperclip className="h-3 w-3" />
                {t("fileAttachAction")}
                <input
                  type="file"
                  multiple
                  ref={(el) => {
                    fileInputRefs.current[idx] = el;
                  }}
                  onChange={(e) => handleFileUpload(idx, e)}
                  className="hidden"
                />
              </label>
              {(task.fileIds ?? []).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(task.fileIds ?? []).map((fileId) => (
                    <div
                      key={fileId}
                      className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
                    >
                      <Paperclip className="h-2.5 w-2.5 shrink-0" />
                      <span className="max-w-[140px] truncate">{fileNames[fileId] ?? fileId}</span>
                      <button type="button" onClick={() => removeFile(idx, fileId)}>
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <Button type="button" variant="ghost" size="sm" onClick={addTask}>
        <Plus className="mr-1 h-4 w-4" />
        {t("addAction")}
      </Button>
    </div>
  );
}
