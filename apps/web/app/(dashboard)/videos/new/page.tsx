"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { videosApi } from "@/lib/api/videos";
import { useVideoSeries, useNextWatchOrder } from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField, NONE_VALUE } from "@/components/select-field";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { FileUploadList, type UploadedFileItem } from "@/components/file-upload-list";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { VIDEO_PASSWORD_LENGTH } from "@community-platform/shared";
import { InstructorList } from "../_components/instructor-list";
import { AccessRolesField } from "../_components/access-roles-field";
import { TaskListEditor } from "../_components/task-list-editor";
import type { InstructorInput, TaskInput } from "@/lib/api/types";

export default function NewVideoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: seriesList } = useVideoSeries();
  const t = useTranslations("videos.new");
  const tForm = useTranslations("videos.form");
  const tPermission = useTranslations("enums.videoViewPermission");

  // 基本情報
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [watchOrder, setWatchOrder] = useState<string>("");
  const [watchOrderTouched, setWatchOrderTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // シリーズ変更時に watchOrder を自動補完（ユーザー未編集時のみ）
  const { data: nextOrder } = useNextWatchOrder(seriesId || undefined);
  const lastSeriesIdRef = useRef<string>("");
  useEffect(() => {
    const seriesChanged = seriesId !== lastSeriesIdRef.current;
    if (seriesChanged) lastSeriesIdRef.current = seriesId;
    if (watchOrderTouched) return;

    let newValue: string | null = null;
    if (!seriesId && seriesChanged) {
      newValue = "";
    } else if (seriesId && nextOrder) {
      newValue = String(nextOrder.nextOrder);
    }
    if (newValue === null) return;
    // 非同期データを state に反映する正当な用途
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchOrder(newValue);
  }, [seriesId, nextOrder, watchOrderTouched]);

  // 公開設定
  const [publishStatus, setPublishStatus] = useState("draft");
  const [viewPermission, setViewPermission] = useState("all");
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [availableUntil, setAvailableUntil] = useState("");
  const [password, setPassword] = useState("");

  // 講師・配布資料・タスク
  const [instructors, setInstructors] = useState<InstructorInput[]>([]);
  const [attachments, setAttachments] = useState<UploadedFileItem[]>([]);
  const [tasks, setTasks] = useState<TaskInput[]>([]);

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error(t("fileNotSelected"));
      return videosApi.upload(file, {
        title,
        description: description || undefined,
        seriesId: seriesId || undefined,
        watchOrder: watchOrder ? Number(watchOrder) : undefined,
        publishStatus,
        availableUntil: availableUntil || undefined,
        viewPermission: viewPermission !== "all" ? viewPermission : undefined,
        allowedRoles: viewPermission === "role_restricted" ? allowedRoles : undefined,
        password: password || undefined,
        instructors: instructors.filter((i) => i.name),
        attachmentFileIds: attachments.map((a) => a.fileId),
        tasks: tasks.filter((t) => t.title),
      });
    },
    onSuccess: (data: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success(t("successToast"));
      router.push(`/videos/${data.id}`);
    },
    onError: () => toast.error(t("errorToast")),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      toast.error(t("fileTypeError"));
      return;
    }
    setFile(selected);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/videos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
      </div>

      {/* シリーズ・順番 */}
      <Card>
        <CardHeader>
          <CardTitle>{tForm("card.seriesOrder")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{tForm("label.series")}</Label>
              <SelectField
                value={seriesId || NONE_VALUE}
                onChange={(v) => setSeriesId(v === NONE_VALUE ? "" : v)}
                options={seriesList?.map((s) => ({ value: s.id, label: s.name })) ?? []}
                includeNone
                placeholder={tForm("label.seriesPlaceholder")}
              />
            </div>
            {seriesId && (
              <div>
                <Label>{tForm("label.watchOrder")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={watchOrder}
                  onChange={(e) => {
                    setWatchOrder(e.target.value);
                    setWatchOrderTouched(true);
                  }}
                  placeholder={tForm("label.watchOrderPlaceholder")}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {tForm("label.watchOrderHintNew")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>{tForm("card.videoInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{tForm("label.title")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tForm("label.titlePlaceholder")}
            />
          </div>
          <div>
            <Label>{tForm("label.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={tForm("label.descriptionPlaceholder")}
            />
          </div>
          <div>
            <Label>{tForm("label.videoFile")}</Label>
            <div className="mt-1">
              {file ? (
                <div className="flex items-center gap-3 rounded border p-3">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    {tForm("label.changeAction")}
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{tForm("label.filePickerHint")}</p>
                  <p className="text-xs text-muted-foreground">
                    {tForm("label.filePickerSizeHint")}
                  </p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 講師 */}
      <Card>
        <CardHeader>
          <CardTitle>{tForm("card.instructors")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InstructorList value={instructors} onChange={setInstructors} />
        </CardContent>
      </Card>

      {/* 配布資料 */}
      <Card>
        <CardHeader>
          <CardTitle>{tForm("card.attachments")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadList value={attachments} onChange={setAttachments} fileCategory="document" />
        </CardContent>
      </Card>

      {/* タスク */}
      <Card>
        <CardHeader>
          <CardTitle>{tForm("card.tasks")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskListEditor value={tasks} onChange={setTasks} />
        </CardContent>
      </Card>

      {/* 公開設定 */}
      <Card>
        <CardHeader>
          <CardTitle>{tForm("card.publish")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{tForm("label.publishStatus")}</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
          <div>
            <Label>{tForm("label.viewPermission")}</Label>
            <SelectField
              value={viewPermission}
              onChange={setViewPermission}
              options={[
                { value: "all", label: tPermission("all") },
                { value: "role_restricted", label: tPermission("role_restricted") },
                { value: "rank_restricted", label: tPermission("rank_restricted") },
              ]}
            />
          </div>
          {viewPermission === "role_restricted" && (
            <AccessRolesField value={allowedRoles} onChange={setAllowedRoles} />
          )}
          <div>
            <Label>{tForm("label.availableUntil")}</Label>
            <Input
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {tForm("label.availableUntilHint")}
            </p>
          </div>
          <div>
            <Label>{tForm("label.password")}</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern={`\\d{${VIDEO_PASSWORD_LENGTH}}`}
              maxLength={VIDEO_PASSWORD_LENGTH}
              value={password}
              onChange={(e) =>
                setPassword(e.target.value.replace(/\D/g, "").slice(0, VIDEO_PASSWORD_LENGTH))
              }
              placeholder={tForm("label.passwordPlaceholderEmpty")}
            />
          </div>
        </CardContent>
      </Card>

      {/* アップロードボタン */}
      <Button
        onClick={() => upload.mutate()}
        disabled={!title || !file || upload.isPending}
        className="w-full"
        size="lg"
      >
        {upload.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("uploading")}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {t("uploadAction")}
          </>
        )}
      </Button>
    </div>
  );
}
