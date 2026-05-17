"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVideos, useVideoSeries } from "@/hooks/videos/use-videos";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, Play, CheckCircle } from "lucide-react";
import { HighlightedText } from "@/components/highlighted-text";
import { useAuth } from "@/hooks/auth/use-auth";
import type { VideoListItem, VideoQuery } from "@/lib/api/types";

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideosPage() {
  const t = useTranslations("videos.list");
  const tPublish = useTranslations("enums.publishStatus");
  const [query, setQuery] = useState<VideoQuery>({
    page: 1,
    limit: 12,
    publishStatus: "published",
  });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useVideos(query);
  const { data: seriesList } = useVideoSeries();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const videos = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((p) => ({ ...p, search: v || undefined, page: 1 }))}
          placeholder={t("searchPlaceholder")}
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={query.seriesId ?? "all"}
            onValueChange={(v) =>
              setQuery((p) => ({ ...p, seriesId: v === "all" ? undefined : v, page: 1 }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("seriesPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allSeries")}</SelectItem>
              {seriesList?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={query.watchStatus ?? "all"}
            onValueChange={(v) =>
              setQuery((p) => ({
                ...p,
                watchStatus: v === "all" ? undefined : (v as "watched" | "unwatched"),
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("watchStatusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("watchStatusAll")}</SelectItem>
              <SelectItem value="unwatched">{t("watchStatusUnwatched")}</SelectItem>
              <SelectItem value="watched">{t("watchStatusWatched")}</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select
              value={query.publishStatus ?? "all"}
              onValueChange={(v) =>
                setQuery((p) => ({
                  ...p,
                  publishStatus: v === "all" ? undefined : v,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("publishStatusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("publishStatusAll")}</SelectItem>
                <SelectItem value="draft">{tPublish("draft")}</SelectItem>
                <SelectItem value="published">{tPublish("published")}</SelectItem>
                <SelectItem value="unpublished">{tPublish("unpublished")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : videos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Video className="mx-auto mb-4 h-12 w-12" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v: VideoListItem) => (
            <Link key={v.id} href={`/videos/${v.id}`}>
              <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <div className="relative h-40 bg-muted">
                  {v.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Play className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {v.durationSeconds && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                      {formatDuration(v.durationSeconds)}
                    </span>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    {v.publishStatus === "draft" && (
                      <Badge variant="secondary" className="text-[10px]">
                        {tPublish("draft")}
                      </Badge>
                    )}
                    {v.publishStatus === "unpublished" && (
                      <Badge variant="destructive" className="text-[10px]">
                        {tPublish("unpublished")}
                      </Badge>
                    )}
                    {v.isWatched && (
                      <Badge variant="default" className="gap-0.5 text-[10px]">
                        <CheckCircle className="h-3 w-3" />
                        {t("watchedBadge")}
                      </Badge>
                    )}
                    {v.incompleteTaskCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t("incompleteTaskBadge", { count: v.incompleteTaskCount })}
                      </Badge>
                    )}
                    {v.taskCount > 0 && v.incompleteTaskCount === 0 && (
                      <Badge variant="default" className="text-[10px]">
                        {t("taskCompleteBadge")}
                      </Badge>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold">
                    <HighlightedText html={v.titleHighlighted} fallback={v.title} />
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("creatorPrefix", { name: v.createdBy.name })}</span>
                    <span className="flex items-center gap-0.5">
                      <Play className="h-3 w-3" />
                      {v.viewCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {meta && (
        <PaginationBar meta={meta} onPageChange={(page) => setQuery((p) => ({ ...p, page }))} />
      )}
    </div>
  );
}
