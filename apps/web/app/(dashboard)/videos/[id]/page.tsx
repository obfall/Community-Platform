"use client";

import { use } from "react";
import Link from "next/link";
import { useVideo, useVideoProgress } from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Download, CheckCircle } from "lucide-react";
import { HlsPlayer } from "./_components/hls-player";

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

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!video)
    return <div className="py-12 text-center text-muted-foreground">動画が見つかりません</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/videos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            {video.category && <Badge variant="outline">{video.category.name}</Badge>}
            {video.series && <Badge variant="secondary">{video.series.name}</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {video.createdBy.name} ・ {video.viewCount}回再生
            {video.durationSeconds && ` ・ ${formatDuration(video.durationSeconds)}`}
          </p>
        </div>
      </div>

      {/* プレーヤーエリア */}
      <HlsPlayer
        playbackUrl={video.playbackUrl}
        streamStatus={video.streamStatus}
        videoId={video.id}
        durationSeconds={video.durationSeconds}
        resumePosition={progress?.lastPositionSeconds}
      />

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

          {/* タスク/ワーク */}
          {video.tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>ワーク・課題</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {video.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 rounded border p-3">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                      <span className="text-sm">{i.name}</span>
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
