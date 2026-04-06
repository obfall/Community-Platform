"use client";

import { useState } from "react";
import Link from "next/link";
import { useVideos, useVideoCategories, useVideoSeries } from "@/hooks/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, Play } from "lucide-react";
import type { VideoListItem, VideoQuery } from "@/lib/api/types";

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideosPage() {
  const [query, setQuery] = useState<VideoQuery>({
    page: 1,
    limit: 12,
    publishStatus: "published",
  });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useVideos(query);
  const { data: categories } = useVideoCategories();
  const { data: seriesList } = useVideoSeries();
  const videos = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">動画</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && setQuery((p) => ({ ...p, search: search || undefined, page: 1 }))
          }
          placeholder="動画を検索..."
          className="max-w-xs"
        />
        <Select
          value={query.categoryId ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, categoryId: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのカテゴリ</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={query.seriesId ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, seriesId: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="シリーズ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのシリーズ</SelectItem>
            {seriesList?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : videos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Video className="mx-auto mb-4 h-12 w-12" />
          <p>動画がありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v: VideoListItem) => (
            <Link key={v.id} href={`/videos/${v.id}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
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
                  {v.category && (
                    <div className="mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {v.category.name}
                      </Badge>
                    </div>
                  )}
                  <h3 className="line-clamp-2 text-sm font-semibold">{v.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{v.createdBy.name}</span>
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

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
            disabled={!meta.hasPreviousPage}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            disabled={!meta.hasNextPage}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
