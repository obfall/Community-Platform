"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { videosApi } from "@/lib/api/videos";
import { useVideoCategories, useVideoSeries, useNextWatchOrder } from "@/hooks/videos/use-videos";
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
import { InstructorList } from "../_components/instructor-list";
import { AccessRolesField } from "../_components/access-roles-field";
import { TaskListEditor } from "../_components/task-list-editor";
import type { InstructorInput, TaskInput } from "@/lib/api/types";

export default function NewVideoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories } = useVideoCategories();
  const { data: seriesList } = useVideoSeries();

  // 基本情報
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
      if (!file) throw new Error("ファイルが選択されていません");
      return videosApi.upload(file, {
        title,
        description: description || undefined,
        categoryId: categoryId || undefined,
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
      toast.success("動画をアップロードしました。HLS 変換を開始します。");
      router.push(`/videos/${data.id}`);
    },
    onError: () => toast.error("アップロードに失敗しました"),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      toast.error("動画ファイルを選択してください");
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
        <h1 className="text-2xl font-bold">動画アップロード</h1>
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
                value={seriesId || NONE_VALUE}
                onChange={(v) => setSeriesId(v === NONE_VALUE ? "" : v)}
                options={seriesList?.map((s) => ({ value: s.id, label: s.name })) ?? []}
                includeNone
                placeholder="シリーズを選択"
              />
            </div>
            {seriesId && (
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
                  シリーズ内で次に使う番号を自動で補完します（変更可）
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>動画情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="動画のタイトル"
            />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="動画の説明"
            />
          </div>
          <div>
            <Label>カテゴリ</Label>
            <SelectField
              value={categoryId || NONE_VALUE}
              onChange={(v) => setCategoryId(v === NONE_VALUE ? "" : v)}
              options={categories?.map((c) => ({ value: c.id, label: c.name })) ?? []}
              includeNone
              placeholder="カテゴリを選択"
            />
          </div>
          <div>
            <Label>動画ファイル</Label>
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
                    変更
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">クリックして動画ファイルを選択</p>
                  <p className="text-xs text-muted-foreground">MP4, MOV, WebM（最大 500MB）</p>
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
            <Label>公開ステータス</Label>
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
            <Input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="空欄の場合はパスワードなし"
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
            アップロード中...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            アップロード
          </>
        )}
      </Button>
    </div>
  );
}
