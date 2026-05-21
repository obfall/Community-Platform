"use client";

import type { Dispatch, SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { filesApi, type UploadedFile } from "@/lib/api/files";
import { validateFileBeforeUpload, acceptAttrFor } from "@/lib/upload/validate";
import type { ProjectMember, ProjectTaskAttachmentItem } from "@/lib/api/types";

export interface TaskFormState {
  title: string;
  description: string;
  requestedDate: string;
  dueDate: string;
  selectedAssignees: string[];
  existingAttachments: ProjectTaskAttachmentItem[];
  newFiles: UploadedFile[];
}

export const EMPTY_TASK_FORM: TaskFormState = {
  title: "",
  description: "",
  requestedDate: "",
  dueDate: "",
  selectedAssignees: [],
  existingAttachments: [],
  newFiles: [],
};

interface Props {
  form: TaskFormState;
  setForm: Dispatch<SetStateAction<TaskFormState>>;
  members: ProjectMember[];
  uploading: boolean;
  setUploading: Dispatch<SetStateAction<boolean>>;
}

export function TaskForm({ form, setForm, members, uploading, setUploading }: Props) {
  const t = useTranslations("projects.tasks");
  const patchForm = (patch: Partial<TaskFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const error = validateFileBeforeUpload(file, "document");
        if (error) {
          toast.error(`${file.name}: ${error}`);
          continue;
        }
        const result = await filesApi.upload(file, "document", true);
        setForm((prev) => ({ ...prev, newFiles: [...prev.newFiles, result] }));
      }
    } catch {
      toast.error(t("form.fileUploadFailed"));
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

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("form.titleLabel")}</Label>
        <Input
          value={form.title}
          onChange={(e) => patchForm({ title: e.target.value })}
          placeholder={t("form.titlePlaceholder")}
        />
      </div>
      <div>
        <Label>{t("form.descriptionLabel")}</Label>
        <Textarea
          value={form.description}
          onChange={(e) => patchForm({ description: e.target.value })}
          rows={3}
          placeholder={t("form.descriptionPlaceholder")}
        />
      </div>
      <div>
        <Label>{t("form.assigneesLabel")}</Label>
        <div className="mt-1 max-h-40 space-y-2 overflow-y-auto rounded border p-2">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.selectedAssignees.includes(m.userId)}
                onCheckedChange={() => toggleAssignee(m.userId)}
              />
              {m.name}
            </label>
          ))}
          {members.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("form.noMembers")}</p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>{t("form.requestedDateLabel")}</Label>
          <Input
            type="date"
            value={form.requestedDate}
            onChange={(e) => patchForm({ requestedDate: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("form.dueDateLabel")}</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => patchForm({ dueDate: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>{t("form.fileLabel")}</Label>
        <div className="mt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-colors hover:bg-accent">
            <Paperclip className="h-4 w-4" />
            {uploading ? t("form.fileUploading") : t("form.fileSelect")}
            <input
              type="file"
              multiple
              accept={acceptAttrFor("document")}
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
}
