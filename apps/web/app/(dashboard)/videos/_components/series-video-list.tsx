"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVideos } from "@/hooks/videos/use-videos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, PlayCircle, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  seriesId: string;
  seriesName: string;
  currentVideoId: string;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SeriesVideoList({ seriesId, seriesName, currentVideoId }: Props) {
  const t = useTranslations("videos.seriesVideoList");
  const { data, isLoading } = useVideos({ seriesId, limit: 100 });
  const videos = data?.data ?? [];

  if (isLoading || videos.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title", { name: seriesName })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {videos.map((v, idx) => {
          const isCurrent = v.id === currentVideoId;
          const content = (
            <div
              className={cn(
                "flex items-center gap-3 rounded-md p-2 text-sm transition-colors",
                isCurrent ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <div
                className={cn(
                  "w-6 shrink-0 text-center text-sm tabular-nums",
                  isCurrent ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {v.watchOrder ?? idx + 1}
              </div>
              <div className="relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {v.thumbnailUrl ? (
                  <Image
                    src={v.thumbnailUrl}
                    alt={v.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <Video className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isCurrent && <PlayCircle className="h-4 w-4 shrink-0 text-primary" />}
                  <span className={cn("truncate font-medium", isCurrent && "text-primary")}>
                    {v.title}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {v.durationSeconds != null && <span>{formatDuration(v.durationSeconds)}</span>}
                  {v.isWatched && (
                    <Badge variant="secondary" className="gap-1 px-1 py-0 text-[10px]">
                      <CheckCircle className="h-2.5 w-2.5" />
                      {t("watchedBadge")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );

          return isCurrent ? (
            <div key={v.id}>{content}</div>
          ) : (
            <Link key={v.id} href={`/videos/${v.id}`} className="block">
              {content}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
