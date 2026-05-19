/* eslint-disable react-hooks/incompatible-library */
"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Eye, EyeOff, Loader2, Upload } from "lucide-react";
import { SelectField, NONE_VALUE } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import {
  MAX_VIDEO_TITLE_LENGTH,
  VIDEO_PASSWORD_LENGTH,
  PublishStatus,
} from "@community-platform/shared";
import { FileUploadList } from "@/components/file-upload-list";
import { InstructorList } from "../../_components/instructor-list";
import { TaskListEditor } from "../../_components/task-list-editor";
import type { VideoDetail } from "@/lib/api/types";
import { toast } from "sonner";
import { buildVideoFormSchema, type VideoFormValues } from "../../_lib/form-schema";

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
  const tValidation = useTranslations("videos.form.validation");

  const schema = useMemo(
    () =>
      buildVideoFormSchema({
        required: (field) =>
          field === "title" ? tValidation("titleRequired") : tValidation("instructorNameRequired"),
        maxLength: (field, max) =>
          field === "title"
            ? tValidation("titleMax", { max })
            : tValidation("instructorNameMax", { max }),
        passwordDigits: (len) => tValidation("passwordDigits", { len }),
      }),
    [tValidation],
  );

  const originalSeriesId = video.series?.id ?? "";

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: video.title,
      description: video.description ?? "",
      seriesId: originalSeriesId,
      watchOrder: video.watchOrder != null ? String(video.watchOrder) : "",
      publishStatus: video.publishStatus as PublishStatus,
      availableUntil: video.availableUntil ? video.availableUntil.slice(0, 16) : "",
      password: "",
      clearPassword: false,
      instructors: video.instructors.map((i) => ({
        userId: i.userId ?? undefined,
        name: i.name,
        affiliation: i.affiliation ?? undefined,
      })),
      attachments: video.attachments.map((a) => ({
        fileId: a.fileId,
        url: a.fileUrl,
        name: a.fileName,
        contentType: "",
      })),
      tasks: video.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        sortOrder: task.sortOrder,
      })),
    },
  });

  const seriesId = form.watch("seriesId");
  const clearPassword = form.watch("clearPassword");

  // シリーズを別のものに変更した時のみ watchOrder を自動補完
  const activeSeriesId = seriesId || undefined;
  const { data: nextOrder } = useNextWatchOrder(
    activeSeriesId && activeSeriesId !== originalSeriesId ? activeSeriesId : undefined,
  );
  const lastSeriesIdRef = useRef(originalSeriesId);
  const [watchOrderTouched, setWatchOrderTouched] = useState(false);

  useEffect(() => {
    const current = seriesId ?? "";
    if (current === lastSeriesIdRef.current) return;
    lastSeriesIdRef.current = current;

    if (watchOrderTouched) return;

    let newValue: string | null = null;
    if (!current) {
      newValue = "";
    } else if (current === originalSeriesId) {
      newValue = video.watchOrder != null ? String(video.watchOrder) : "";
    } else if (nextOrder) {
      newValue = String(nextOrder.nextOrder);
    }
    if (newValue === null) return;
    // 非同期データを form に反映
    // eslint-disable-next-line react-hooks/set-state-in-effect
    form.setValue("watchOrder", newValue);
  }, [seriesId, nextOrder, watchOrderTouched, originalSeriesId, video.watchOrder, form]);

  // パスワード「解除する」チェック時は入力をクリア
  useEffect(() => {
    if (clearPassword) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      form.setValue("password", "");
    }
  }, [clearPassword, form]);

  // 公開設定
  const [showPassword, setShowPassword] = useState(false);

  // ファイル差し替え（form 外で管理）
  const [showReplace, setShowReplace] = useState(false);
  const [replaceFileState, setReplaceFileState] = useState<File | null>(null);

  const onSubmit = (values: VideoFormValues) => {
    let passwordValue: string | null | undefined = undefined;
    if (values.clearPassword) {
      passwordValue = null;
    } else if (values.password) {
      passwordValue = values.password;
    }

    updateVideo.mutate(
      {
        id,
        data: {
          title: values.title,
          description: values.description || null,
          publishStatus: values.publishStatus,
          seriesId: values.seriesId || null,
          watchOrder: values.seriesId && values.watchOrder ? Number(values.watchOrder) : null,
          availableUntil: values.availableUntil
            ? new Date(values.availableUntil).toISOString()
            : null,
          password: passwordValue,
          instructors: values.instructors.filter((i) => i.name),
          attachmentFileIds: values.attachments.map((a) => a.fileId),
          tasks: values.tasks
            .filter((task) => task.title)
            .map(({ id: taskId, title, description, sortOrder, fileIds }) => ({
              id: taskId,
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* シリーズ・順番 */}
          <Card>
            <CardHeader>
              <CardTitle>{tForm("card.seriesOrder")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="seriesId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tForm("label.series")}</FormLabel>
                      <FormControl>
                        <SelectField
                          value={field.value || NONE_VALUE}
                          onChange={(v) => field.onChange(v === NONE_VALUE ? "" : v)}
                          options={seriesList?.map((s) => ({ value: s.id, label: s.name })) ?? []}
                          includeNone
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {seriesId && (
                  <FormField
                    control={form.control}
                    name="watchOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tForm("label.watchOrder")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setWatchOrderTouched(true);
                            }}
                            placeholder={tForm("label.watchOrderPlaceholder")}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tForm("label.watchOrderHintEdit")}
                        </p>
                      </FormItem>
                    )}
                  />
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
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("label.title")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={tForm("label.titlePlaceholderEdit")}
                        maxLength={MAX_VIDEO_TITLE_LENGTH}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("label.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={tForm("label.descriptionPlaceholderEdit")}
                        rows={4}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 講師 */}
          <Card>
            <CardHeader>
              <CardTitle>{tForm("card.instructors")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="instructors"
                render={({ field }) => (
                  <InstructorList value={field.value} onChange={field.onChange} />
                )}
              />
            </CardContent>
          </Card>

          {/* 配布資料 */}
          <Card>
            <CardHeader>
              <CardTitle>{tForm("card.attachments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FileUploadList
                    value={field.value}
                    onChange={field.onChange}
                    fileCategory="document"
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* タスク */}
          <Card>
            <CardHeader>
              <CardTitle>{tForm("card.tasks")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="tasks"
                render={({ field }) => (
                  <TaskListEditor value={field.value} onChange={field.onChange} />
                )}
              />
            </CardContent>
          </Card>

          {/* 公開設定 */}
          <Card>
            <CardHeader>
              <CardTitle>{tForm("card.publish")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="publishStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("label.publishStatusEdit")}</FormLabel>
                    <FormControl>
                      <SelectField
                        value={field.value}
                        onChange={(v) => field.onChange(v as PublishStatus)}
                        options={PUBLISH_STATUS_OPTIONS}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("label.availableUntil")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tForm("label.availableUntilHint")}
                    </p>
                  </FormItem>
                )}
              />

              <div>
                <Label>{tForm("label.password")}</Label>
                {video.hasPassword && !clearPassword && (
                  <Input type="password" value="0000" disabled className="mb-2" />
                )}
                {!clearPassword && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              inputMode="numeric"
                              pattern={`\\d{${VIDEO_PASSWORD_LENGTH}}`}
                              maxLength={VIDEO_PASSWORD_LENGTH}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.replace(/\D/g, "").slice(0, VIDEO_PASSWORD_LENGTH),
                                )
                              }
                              placeholder={
                                video.hasPassword
                                  ? tForm("label.passwordPlaceholderChange")
                                  : tForm("label.passwordPlaceholderEmpty")
                              }
                              className="pr-10"
                            />
                          </FormControl>
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
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {video.hasPassword && (
                  <FormField
                    control={form.control}
                    name="clearPassword"
                    render={({ field }) => (
                      <FormItem>
                        <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={field.value ?? false}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                          {tForm("label.passwordClearLabel")}
                        </label>
                      </FormItem>
                    )}
                  />
                )}
                {video.hasPassword && !clearPassword && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tForm("label.passwordExistingHint")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 動画ファイル差し替え（form 外フロー） */}
          <Card>
            <CardHeader>
              <CardTitle>{t("replaceFile.cardTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t("replaceFile.statusPrefix")} </span>
                  <span className="font-medium">
                    {tStream.has(video.streamStatus)
                      ? tStream(video.streamStatus)
                      : video.streamStatus}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReplace(true)}
                >
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
              <Button type="button" variant="outline">
                {t("cancelAction")}
              </Button>
            </Link>
            <Button type="submit" disabled={updateVideo.isPending}>
              {updateVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("saveAction")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
