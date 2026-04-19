"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useVideo,
  useUpdateVideo,
  useVideoCategories,
  useVideoSeries,
  useReplaceVideoFile,
  useNextWatchOrder,
} from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { SelectField, NONE_VALUE } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { FileUploadList, type UploadedFileItem } from "@/components/file-upload-list";
import { InstructorList } from "../../_components/instructor-list";
import { AccessRolesField } from "../../_components/access-roles-field";
import { TaskListEditor } from "../../_components/task-list-editor";
import type { VideoDetail, InstructorInput, TaskInput } from "@/lib/api/types";
import { toast } from "sonner";

export default function VideoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: video, isLoading } = useVideo(id);
  const { data: categories } = useVideoCategories();
  const { data: seriesList } = useVideoSeries();
  const updateVideo = useUpdateVideo();
  const replaceFile = useReplaceVideoFile();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!video) {
    return <div className="py-12 text-center text-muted-foreground">動画が見つかりません</div>;
  }

  return (
    <VideoEditForm
      video={video}
      categories={categories}
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
  categories,
  seriesList,
  updateVideo,
  replaceFile,
  router,
  id,
}: {
  video: VideoDetail;
  categories: Array<{ id: string; name: string }> | undefined;
  seriesList: Array<{ id: string; name: string }> | undefined;
  updateVideo: ReturnType<typeof useUpdateVideo>;
  replaceFile: ReturnType<typeof useReplaceVideoFile>;
  router: ReturnType<typeof useRouter>;
  id: string;
}) {
  // 基本情報
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [publishStatus, setPublishStatus] = useState(video.publishStatus);
  const [categoryId, setCategoryId] = useState(video.category?.id ?? NONE_VALUE);
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
  const [viewPermission, setViewPermission] = useState(video.viewPermission ?? "all");
  const [allowedRoles, setAllowedRoles] = useState<string[]>(video.allowedRoles ?? []);
  const [availableUntil, setAvailableUntil] = useState(
    video.availableUntil ? video.availableUntil.slice(0, 16) : "",
  );
  const [password, setPassword] = useState("");
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
          categoryId: categoryId === NONE_VALUE ? null : categoryId,
          seriesId: seriesId === NONE_VALUE ? null : seriesId,
          watchOrder: seriesId !== NONE_VALUE && watchOrder ? Number(watchOrder) : null,
          viewPermission,
          allowedRoles: viewPermission === "role_restricted" ? allowedRoles : [],
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
        <h1 className="text-2xl font-bold">動画編集</h1>
      </div>

      {/* シリーズ・順番 */}
      <Card>
        <CardHeader>
          <CardTitle>シリーズ・順番</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>シリーズ</Label>
              <SelectField
                value={seriesId}
                onChange={setSeriesId}
                options={seriesList?.map((s) => ({ value: s.id, label: s.name })) ?? []}
                includeNone
              />
            </div>
            {seriesId !== NONE_VALUE && (
              <div>
                <Label>順番（watchOrder）</Label>
                <Input
                  type="number"
                  min={0}
                  value={watchOrder}
                  onChange={(e) => {
                    setWatchOrder(e.target.value);
                    setWatchOrderTouched(true);
                  }}
                  placeholder="シリーズ内の順番（数値）"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  シリーズを変更すると次に使う番号を自動補完します
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="動画タイトル"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="動画の説明（任意）"
              rows={4}
            />
          </div>

          <div>
            <Label>カテゴリ</Label>
            <SelectField
              value={categoryId}
              onChange={setCategoryId}
              options={categories?.map((c) => ({ value: c.id, label: c.name })) ?? []}
              includeNone
            />
          </div>
        </CardContent>
      </Card>

      {/* 講師 */}
      <Card>
        <CardHeader>
          <CardTitle>担当講師</CardTitle>
        </CardHeader>
        <CardContent>
          <InstructorList value={instructors} onChange={setInstructors} />
        </CardContent>
      </Card>

      {/* 配布資料 */}
      <Card>
        <CardHeader>
          <CardTitle>配布資料</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadList value={attachments} onChange={setAttachments} fileCategory="document" />
        </CardContent>
      </Card>

      {/* タスク */}
      <Card>
        <CardHeader>
          <CardTitle>タスク</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskListEditor value={tasks} onChange={setTasks} />
        </CardContent>
      </Card>

      {/* 公開設定 */}
      <Card>
        <CardHeader>
          <CardTitle>公開設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>公開状態</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>

          <div>
            <Label>閲覧可能範囲</Label>
            <SelectField
              value={viewPermission}
              onChange={setViewPermission}
              options={[
                { value: "all", label: "すべて" },
                { value: "role_restricted", label: "ロール制限" },
                { value: "rank_restricted", label: "ランク制限" },
              ]}
            />
          </div>
          {viewPermission === "role_restricted" && (
            <AccessRolesField value={allowedRoles} onChange={setAllowedRoles} />
          )}

          <div>
            <Label>閲覧期限</Label>
            <Input
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">空欄の場合は無期限</p>
          </div>

          <div>
            <Label>パスワード（4桁数字）</Label>
            {video.hasPassword && !clearPassword && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">パスワード設定済み</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearPassword(true)}
                >
                  パスワード削除
                </Button>
              </div>
            )}
            {clearPassword && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-destructive">パスワードを削除します</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearPassword(false)}
                >
                  取消
                </Button>
              </div>
            )}
            {!clearPassword && (
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder={
                  video.hasPassword ? "変更する場合のみ入力" : "空欄の場合はパスワードなし"
                }
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* 動画ファイル差し替え */}
      <Card>
        <CardHeader>
          <CardTitle>動画ファイル</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">ステータス: </span>
              <span className="font-medium">{video.streamStatus}</span>
              {video.durationSeconds && (
                <span className="ml-3 text-muted-foreground">
                  時間: {Math.floor(video.durationSeconds / 60)}分{video.durationSeconds % 60}秒
                </span>
              )}
            </div>
          </div>

          {!showReplace ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowReplace(true)}>
              動画ファイルを差し替える
            </Button>
          ) : (
            <div className="space-y-2 rounded-md border p-3">
              <Label>新しい動画ファイル</Label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.type.startsWith("video/")) setReplaceFileState(f);
                  else toast.error("動画ファイルを選択してください");
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
                  差し替え開始
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
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-2">
        <Link href="/videos/manage">
          <Button variant="outline">キャンセル</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={!title || updateVideo.isPending}>
          {updateVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存
        </Button>
      </div>
    </div>
  );
}
