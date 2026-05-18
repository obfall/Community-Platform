"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useVideo,
  useUpdateVideo,
  useVideoSeries,
  useReplaceVideoFile,
  useNextWatchOrder,
} from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff, Loader2, Upload } from "lucide-react";
import { SelectField, NONE_VALUE } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { MAX_VIDEO_TITLE_LENGTH, VIDEO_PASSWORD_LENGTH } from "@community-platform/shared";
import { FileUploadList, type UploadedFileItem } from "@/components/file-upload-list";
import { InstructorList } from "../../_components/instructor-list";
import { TaskListEditor } from "../../_components/task-list-editor";
import type { VideoDetail, InstructorInput, TaskInput } from "@/lib/api/types";
import { toast } from "sonner";

export default function VideoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("videos.edit");
  const { data: video, isLoading } = useVideo(id);
  const { data: seriesList } = useVideoSeries();
  const updateVideo = useUpdateVideo();
  const replaceFile = useReplaceVideoFile();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
  }
  if (!video) {
    return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>;
  }

  return (
    <VideoEditForm
      video={video}
      seriesList={seriesList}
      updateVideo={updateVideo}
      replaceFile={replaceFile}
      router={router}
      id={id}
    />
  );
}

function VideoEditForm({
  video,
  seriesList,
  updateVideo,
  replaceFile,
  router,
  id,
}: {
  video: VideoDetail;
  seriesList: Array<{ id: string; name: string }> | undefined;
  updateVideo: ReturnType<typeof useUpdateVideo>;
  replaceFile: ReturnType<typeof useReplaceVideoFile>;
  router: ReturnType<typeof useRouter>;
  id: string;
}) {
  const t = useTranslations("videos.edit");
  const tForm = useTranslations("videos.form");
  const tStream = useTranslations("enums.videoStreamStatus");

  // 基本情報
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [publishStatus, setPublishStatus] = useState(video.publishStatus);
  const [seriesId, setSeriesId] = useState(video.series?.id ?? NONE_VALUE);
  const [watchOrder, setWatchOrder] = useState(
    video.watchOrder != null ? String(video.watchOrder) : "",
  );
  const [watchOrderTouched, setWatchOrderTouched] = useState(false);
  const originalSeriesId = video.series?.id ?? NONE_VALUE;

  // シリーズを別のものに変更した時のみ自動補完（元のシリーズに戻した時は元の値を復元）
  const activeSeriesId = seriesId !== NONE_VALUE ? seriesId : undefined;
  const { data: nextOrder } = useNextWatchOrder(
    activeSeriesId && activeSeriesId !== originalSeriesId ? activeSeriesId : undefined,
  );
  const lastSeriesIdRef = useRef(originalSeriesId);
  useEffect(() => {
    if (seriesId === lastSeriesIdRef.current) return;
    lastSeriesIdRef.current = seriesId;

    if (watchOrderTouched) return; // 手動編集があれば触らない

    let newValue: string | null = null;
    if (seriesId === NONE_VALUE) {
      newValue = "";
    } else if (seriesId === originalSeriesId) {
      // 元のシリーズに戻した → 元の値を復元
      newValue = video.watchOrder != null ? String(video.watchOrder) : "";
    } else if (nextOrder) {
      newValue = String(nextOrder.nextOrder);
    }
    if (newValue === null) return;
    // 非同期データを state に反映する正当な用途
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchOrder(newValue);
  }, [seriesId, nextOrder, watchOrderTouched, originalSeriesId, video.watchOrder]);

  // 公開設定
  const [availableUntil, setAvailableUntil] = useState(
    video.availableUntil ? video.availableUntil.slice(0, 16) : "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clearPassword, setClearPassword] = useState(false);

  // 講師
  const [instructors, setInstructors] = useState<InstructorInput[]>(
    video.instructors.map((i) => ({
      userId: i.userId ?? undefined,
      name: i.name,
      affiliation: i.affiliation ?? undefined,
    })),
  );

  // 配布資料
  const [attachments, setAttachments] = useState<UploadedFileItem[]>(
    video.attachments.map((a) => ({
      fileId: a.fileId,
      url: a.fileUrl,
      name: a.fileName,
      contentType: "",
    })),
  );

  // タスク
  const [tasks, setTasks] = useState<TaskInput[]>(
    video.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      sortOrder: t.sortOrder,
    })),
  );

  // ファイル差し替え
  const [showReplace, setShowReplace] = useState(false);
  const [replaceFileState, setReplaceFileState] = useState<File | null>(null);

  const handleSubmit = () => {
    let passwordValue: string | null | undefined = undefined;
    if (clearPassword) {
      passwordValue = null;
    } else if (password) {
      passwordValue = password;
    }

    updateVideo.mutate(
      {
        id,
        data: {
          title,
          description: description || null,
          publishStatus,
          seriesId: seriesId === NONE_VALUE ? null : seriesId,
          watchOrder: seriesId !== NONE_VALUE && watchOrder ? Number(watchOrder) : null,
          availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
          password: passwordValue,
          instructors: instructors.filter((i) => i.name),
          attachmentFileIds: attachments.map((a) => a.fileId),
          tasks: tasks
            .filter((t) => t.title)
            .map(({ id, title, description, sortOrder, fileIds }) => ({
              id,
              title,
              description,
              sortOrder,
              fileIds,
            })),
        },
      },
      {
        onSuccess: () => router.push("/videos/manage"),
      },
    );
  };

  const handleReplaceFile = () => {
    if (!replaceFileState) return;
    replaceFile.mutate({ id, file: replaceFileState });
    setShowReplace(false);
    setReplaceFileState(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/videos/manage">
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
                value={seriesId}
                onChange={setSeriesId}
                options={seriesList?.map((s) => ({ value: s.id, label: s.name })) ?? []}
                includeNone
              />
            </div>
            {seriesId !== NONE_VALUE && (
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
                  {tForm("label.watchOrderHintEdit")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>{tForm("card.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">{tForm("label.title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tForm("label.titlePlaceholderEdit")}
              maxLength={MAX_VIDEO_TITLE_LENGTH}
            />
          </div>

          <div>
            <Label htmlFor="description">{tForm("label.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tForm("label.descriptionPlaceholderEdit")}
              rows={4}
            />
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
            <Label>{tForm("label.publishStatusEdit")}</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>

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
            {video.hasPassword && !clearPassword && (
              <Input type="password" value="0000" disabled className="mb-2" />
            )}
            {!clearPassword && (
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  pattern={`\\d{${VIDEO_PASSWORD_LENGTH}}`}
                  maxLength={VIDEO_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value.replace(/\D/g, "").slice(0, VIDEO_PASSWORD_LENGTH))
                  }
                  placeholder={
                    video.hasPassword
                      ? tForm("label.passwordPlaceholderChange")
                      : tForm("label.passwordPlaceholderEmpty")
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPassword
                      ? tForm("label.passwordToggleHide")
                      : tForm("label.passwordToggleShow")
                  }
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            {video.hasPassword && (
              <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={clearPassword}
                  onChange={(e) => {
                    setClearPassword(e.target.checked);
                    if (e.target.checked) setPassword("");
                  }}
                />
                {tForm("label.passwordClearLabel")}
              </label>
            )}
            {video.hasPassword && !clearPassword && (
              <p className="mt-1 text-xs text-muted-foreground">
                {tForm("label.passwordExistingHint")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 動画ファイル差し替え */}
      <Card>
        <CardHeader>
          <CardTitle>{t("replaceFile.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">{t("replaceFile.statusPrefix")} </span>
              <span className="font-medium">
                {tStream.has(video.streamStatus) ? tStream(video.streamStatus) : video.streamStatus}
              </span>
              {video.durationSeconds && (
                <span className="ml-3 text-muted-foreground">
                  {t("replaceFile.durationFormat", {
                    minutes: Math.floor(video.durationSeconds / 60),
                    seconds: video.durationSeconds % 60,
                  })}
                </span>
              )}
            </div>
          </div>

          {!showReplace ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowReplace(true)}>
              {t("replaceFile.openButton")}
            </Button>
          ) : (
            <div className="space-y-2 rounded-md border p-3">
              <Label>{t("replaceFile.newFileLabel")}</Label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.type.startsWith("video/")) setReplaceFileState(f);
                  else toast.error(t("replaceFile.fileTypeError"));
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleReplaceFile}
                  disabled={!replaceFileState || replaceFile.isPending}
                >
                  {replaceFile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-1 h-4 w-4" />
                  {t("replaceFile.submit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReplace(false);
                    setReplaceFileState(null);
                  }}
                >
                  {t("replaceFile.cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-2">
        <Link href="/videos/manage">
          <Button variant="outline">{t("cancelAction")}</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={!title || updateVideo.isPending}>
          {updateVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("saveAction")}
        </Button>
      </div>
    </div>
  );
}
