/* eslint-disable react-hooks/incompatible-library */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { videosApi } from "@/lib/api/videos";
import { useVideoSeries, useNextWatchOrder } from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField, NONE_VALUE } from "@/components/select-field";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { FileUploadList } from "@/components/file-upload-list";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { VIDEO_PASSWORD_LENGTH, PublishStatus } from "@community-platform/shared";
import { InstructorList } from "../_components/instructor-list";
import { TaskListEditor } from "../_components/task-list-editor";
import { buildVideoFormSchema, type VideoFormValues } from "../_lib/form-schema";

export default function NewVideoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: seriesList } = useVideoSeries();
  const t = useTranslations("videos.new");
  const tForm = useTranslations("videos.form");
  const tValidation = useTranslations("videos.form.validation");

  // 動画ファイルは File 型のため form 値からは分離して useState で持つ。
  // バリデーションは submit 時に「未選択ならエラートースト」で処理する。
  const [file, setFile] = useState<File | null>(null);

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

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      seriesId: "",
      watchOrder: "",
      publishStatus: PublishStatus.DRAFT,
      availableUntil: "",
      password: "",
      clearPassword: false,
      instructors: [],
      attachments: [],
      tasks: [],
    },
  });

  const seriesId = form.watch("seriesId");
  // シリーズ選択時は末尾の順番（max + 1）をサーバから取得して送信する
  const { data: nextOrder } = useNextWatchOrder(seriesId || undefined);

  const upload = useMutation({
    mutationFn: (values: VideoFormValues) => {
      if (!file) throw new Error(t("fileNotSelected"));
      return videosApi.upload(file, {
        title: values.title,
        description: values.description || undefined,
        seriesId: values.seriesId || undefined,
        watchOrder: values.seriesId && nextOrder ? nextOrder.nextOrder : undefined,
        publishStatus: values.publishStatus,
        availableUntil: values.availableUntil || undefined,
        password: values.password || undefined,
        instructors: values.instructors.filter((i) => i.name),
        attachmentFileIds: values.attachments.map((a) => a.fileId),
        tasks: values.tasks.filter((t) => t.title),
      });
    },
    onSuccess: (data: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success(t("successToast"));
      router.push(`/videos/${data.id}`);
    },
    // エラートーストはグローバル任せ
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

  const onSubmit = (values: VideoFormValues) => {
    if (!file) {
      toast.error(t("fileNotSelected"));
      return;
    }
    upload.mutate(values);
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 動画情報 */}
          <Card>
            <CardHeader>
              <CardTitle>{tForm("card.videoInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        placeholder={tForm("label.seriesPlaceholder")}
                      />
                    </FormControl>
                    {field.value && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tForm("label.watchOrderNoticeNew")}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("label.title")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={tForm("label.titlePlaceholder")} />
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
                        rows={4}
                        placeholder={tForm("label.descriptionPlaceholder")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

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
                      <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                        {tForm("label.changeAction")}
                      </Button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {tForm("label.filePickerHint")}
                      </p>
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
                    <FormLabel>{tForm("label.publishStatus")}</FormLabel>
                    <FormControl>
                      <SelectField
                        value={field.value}
                        onChange={field.onChange}
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("label.password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        inputMode="numeric"
                        pattern={`\\d{${VIDEO_PASSWORD_LENGTH}}`}
                        maxLength={VIDEO_PASSWORD_LENGTH}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.replace(/\D/g, "").slice(0, VIDEO_PASSWORD_LENGTH),
                          )
                        }
                        placeholder={tForm("label.passwordPlaceholderEmpty")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* アップロードボタン */}
          <Button type="submit" disabled={!file || upload.isPending} className="w-full" size="lg">
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
        </form>
      </Form>
    </div>
  );
}
