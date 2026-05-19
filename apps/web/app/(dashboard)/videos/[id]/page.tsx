"use client";

import { use, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Circle,
  Shield,
  BarChart3,
  Paperclip,
} from "lucide-react";
// hls.js は ~156KB (gzip) と重く、動画詳細ページでしか使わないため動的 import で遅延ロード
const HlsPlayer = dynamic(() => import("./_components/hls-player").then((m) => m.HlsPlayer), {
  ssr: false,
  loading: () => <PlayerLoadingSkeleton />,
});
import { VideoPasswordDialog, isVideoUnlocked } from "../_components/video-password-dialog";
import { SeriesNav } from "../_components/series-nav";
import { SeriesVideoList } from "../_components/series-video-list";
import type { VideoTaskStatus } from "@/lib/api/types";

function PlayerLoadingSkeleton() {
  const t = useTranslations("videos.detail");
  return (
    <div
      className="aspect-video w-full animate-pulse rounded-md bg-muted"
      aria-label={t("playerLoadingAria")}
    />
  );
}

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
  const router = useRouter();
  const t = useTranslations("videos.detail");
  const tTaskStatus = useTranslations("enums.videoTaskStatus");
  const { data: video, isLoading } = useVideo(id);
  const { data: progress } = useVideoProgress(id);
  const { user } = useAuth();
  const updateStatus = useUpdateTaskStatus();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/videos");
    }
  }, [router]);

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
    return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
  if (!video) return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>;

  const allTasksComplete =
    video.tasks.length > 0 && video.tasks.every((t) => t.status === "completed");

  const taskStatusOptions: { value: VideoTaskStatus; label: string }[] = [
    { value: "not_started", label: tTaskStatus("not_started") },
    { value: "in_progress", label: tTaskStatus("in_progress") },
    { value: "completed", label: tTaskStatus("completed") },
  ];

  return (
    <div className="space-y-6">
      {/* パスワードダイアログ */}
      {needsPassword && (
        <VideoPasswordDialog videoId={video.id} onUnlocked={() => setPasswordUnlocked(true)} />
      )}

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {video.series && <Badge variant="secondary">{video.series.name}</Badge>}
            {video.hasPassword && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                {t("passwordProtectedBadge")}
              </Badge>
            )}
            {progress?.isCompleted ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {t("watchCompletedBadge")}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Circle className="h-3 w-3" />
                {t("watchUnwatchedBadge")}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("metaPrefix", { name: video.createdBy.name, viewCount: video.viewCount })}
            {video.durationSeconds &&
              t("metaDurationSuffix", { duration: formatDuration(video.durationSeconds) })}
            {video.availableUntil &&
              t("metaAvailableUntilSuffix", {
                date: new Date(video.availableUntil).toLocaleDateString("ja-JP"),
              })}
          </p>
        </div>
        {isAdmin && video.tasks.length > 0 && (
          <Link href={`/videos/${video.id}/task-progress`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1 h-4 w-4" />
              {t("taskProgressLink")}
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
        />
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

      {/* シリーズ動画一覧 */}
      {video.series && (
        <SeriesVideoList
          seriesId={video.series.id}
          seriesName={video.series.name}
          currentVideoId={video.id}
        />
      )}

      {/* 次の動画 CTA（90%以上視聴で表示） */}
      {progress?.isCompleted && video.nextVideo && (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium">{t("nextVideoCta")}</span>
            <Link href={`/videos/${video.nextVideo.id}`}>
              <Button size="sm">{t("nextVideoButton", { title: video.nextVideo.title })}</Button>
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
                <CardTitle>{t("descriptionTitle")}</CardTitle>
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
                <CardTitle>{t("tasksTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">{t("taskTable.index")}</TableHead>
                        <TableHead>{t("taskTable.task")}</TableHead>
                        <TableHead className="w-28">{t("taskTable.currentStatus")}</TableHead>
                        <TableHead className="w-36">{t("taskTable.statusChange")}</TableHead>
                        <TableHead className="w-36">{t("taskTable.updatedAt")}</TableHead>
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
                              {task.attachments.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {task.attachments.map((a) => (
                                    <a
                                      key={a.id}
                                      href={a.fileUrl ?? "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] hover:bg-accent"
                                    >
                                      <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                      <span className="max-w-[120px] truncate">{a.fileName}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant(status)} className="text-[10px]">
                                {tTaskStatus(status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <SelectField
                                value={status}
                                onChange={(v) => handleChangeStatus(task.id, v as VideoTaskStatus)}
                                options={taskStatusOptions}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {status === "completed" && task.completedAt ? (
                                <>
                                  {t("taskTable.completedAt", {
                                    date: new Date(task.completedAt).toLocaleDateString("ja-JP"),
                                  })}
                                </>
                              ) : task.statusUpdatedAt ? (
                                <>
                                  {t("taskTable.updatedAtValue", {
                                    date: new Date(task.statusUpdatedAt).toLocaleDateString(
                                      "ja-JP",
                                    ),
                                  })}
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
                    <span className="text-sm font-medium">{t("allTasksCompleted")}</span>
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
                <CardTitle>{t("instructorsTitle")}</CardTitle>
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
                <CardTitle>{t("attachmentsTitle")}</CardTitle>
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
