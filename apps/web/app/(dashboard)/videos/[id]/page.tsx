"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useVideo, useVideoProgress, useUpdateTaskStatus } from "@/hooks/videos/use-videos";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SelectField } from "@/components/select-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, CheckCircle, Shield, Clock, BarChart3 } from "lucide-react";
import { HlsPlayer } from "./_components/hls-player";
import { VideoPasswordDialog, isVideoUnlocked } from "../_components/video-password-dialog";
import { SeriesNav } from "../_components/series-nav";
import type { VideoTaskStatus } from "@/lib/api/types";

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

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: video, isLoading } = useVideo(id);
  const { data: progress } = useVideoProgress(id);
  const { user } = useAuth();
  const updateStatus = useUpdateTaskStatus();

  const [passwordUnlocked, setPasswordUnlocked] = useState(false);

  const needsPassword =
    video?.hasPassword && !passwordUnlocked && !isVideoUnlocked(video?.id ?? "");

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const handleChangeStatus = useCallback(
    (taskId: string, status: VideoTaskStatus) => {
      updateStatus.mutate({ taskId, status });
    },
    [updateStatus],
  );

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!video)
    return <div className="py-12 text-center text-muted-foreground">動画が見つかりません</div>;

  // 閲覧期限チェック
  const isExpired = video.availableUntil && new Date(video.availableUntil) < new Date();

  const allTasksComplete =
    video.tasks.length > 0 && video.tasks.every((t) => t.status === "completed");

  return (
    <div className="space-y-6">
      {/* パスワードダイアログ */}
      {needsPassword && (
        <VideoPasswordDialog videoId={video.id} onUnlocked={() => setPasswordUnlocked(true)} />
      )}

      <div className="flex items-center gap-4">
        <Link href="/videos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {video.category && <Badge variant="outline">{video.category.name}</Badge>}
            {video.series && <Badge variant="secondary">{video.series.name}</Badge>}
            {video.viewPermission === "role_restricted" && (
              <Badge variant="destructive" className="gap-1">
                <Shield className="h-3 w-3" />
                限定: {video.allowedRoles.join(", ")}
              </Badge>
            )}
            {video.hasPassword && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                パスワード保護
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {video.createdBy.name} ・ {video.viewCount}回再生
            {video.durationSeconds && ` ・ ${formatDuration(video.durationSeconds)}`}
          </p>
        </div>
        {isAdmin && video.tasks.length > 0 && (
          <Link href={`/videos/${video.id}/task-progress`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1 h-4 w-4" />
              タスク進捗を見る
            </Button>
          </Link>
        )}
      </div>

      {/* プレーヤーエリア */}
      {!needsPassword && (
        <HlsPlayer
          playbackUrl={video.playbackUrl}
          streamStatus={video.streamStatus}
          videoId={video.id}
          durationSeconds={video.durationSeconds}
          resumePosition={progress?.lastPositionSeconds}
        />
      )}

      {/* 閲覧期限バナー */}
      {video.availableUntil && (
        <Card className={isExpired ? "border-destructive" : ""}>
          <CardContent className="flex items-center gap-2 py-3">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {isExpired
                ? `閲覧期限: ${new Date(video.availableUntil).toLocaleDateString("ja-JP")}（期限切れ）`
                : `閲覧期限: ${new Date(video.availableUntil).toLocaleDateString("ja-JP")}`}
            </span>
          </CardContent>
        </Card>
      )}

      {/* 視聴進捗 */}
      {progress && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${Math.round((progress.watchedSeconds / progress.totalSeconds) * 100)}%`,
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDuration(progress.watchedSeconds)} / {formatDuration(progress.totalSeconds)}
            </span>
            {progress.isCompleted && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                視聴完了
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* シリーズナビ */}
      {video.series && (
        <SeriesNav
          prevVideo={video.prevVideo}
          nextVideo={video.nextVideo}
          currentOrder={video.watchOrder}
          seriesVideoCount={video.seriesVideoCount}
        />
      )}

      {/* 次の動画 CTA（90%以上視聴で表示） */}
      {progress?.isCompleted && video.nextVideo && (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium">次の動画へ進みましょう</span>
            <Link href={`/videos/${video.nextVideo.id}`}>
              <Button size="sm">{video.nextVideo.title} へ →</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 概要 */}
          {video.description && (
            <Card>
              <CardHeader>
                <CardTitle>概要</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {video.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* タスク/ワーク（ステータス管理） */}
          {video.tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>ワーク・課題</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>タスク</TableHead>
                        <TableHead className="w-28">現在</TableHead>
                        <TableHead className="w-36">ステータス変更</TableHead>
                        <TableHead className="w-36">更新 / 完了</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {video.tasks.map((task, idx) => {
                        const status = (task.status ?? "not_started") as VideoTaskStatus;
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="text-center text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div
                                className={`text-sm font-medium ${status === "completed" ? "line-through text-muted-foreground" : ""}`}
                              >
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {task.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant(status)} className="text-[10px]">
                                {TASK_STATUS_LABEL[status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <SelectField
                                value={status}
                                onChange={(v) => handleChangeStatus(task.id, v as VideoTaskStatus)}
                                options={TASK_STATUS_OPTIONS}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {status === "completed" && task.completedAt ? (
                                <>完了: {new Date(task.completedAt).toLocaleDateString("ja-JP")}</>
                              ) : task.statusUpdatedAt ? (
                                <>
                                  更新: {new Date(task.statusUpdatedAt).toLocaleDateString("ja-JP")}
                                </>
                              ) : (
                                <span className="text-muted-foreground/60">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

        <div className="space-y-4">
          {/* 講師 */}
          {video.instructors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>講師</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {video.instructors.map((i) => (
                    <div key={i.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{i.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{i.name}</p>
                        {i.affiliation && (
                          <p className="text-xs text-muted-foreground">{i.affiliation}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 配布資料 */}
          {video.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>配布資料</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {video.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.fileUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center gap-2 rounded border p-2 text-sm hover:bg-accent"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="truncate">{a.fileName}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
