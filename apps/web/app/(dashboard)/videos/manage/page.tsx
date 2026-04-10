"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useVideos,
  useVideoCategories,
  useCreateVideoCategory,
  useVideoSeries,
  useCreateVideoSeries,
  useDeleteVideo,
} from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Plus, Pencil, Trash2, Video } from "lucide-react";
import type { VideoListItem, VideoQuery } from "@/lib/api/types";

const PUBLISH_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  archived: "アーカイブ",
};

const STREAM_STATUS_LABELS: Record<string, string> = {
  uploading: "アップロード中",
  processing: "変換中",
  ready: "配信可能",
  error: "エラー",
};

const STREAM_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  uploading: "secondary",
  processing: "secondary",
  ready: "default",
  error: "destructive",
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function VideoManagePage() {
  const router = useRouter();
  const [query, setQuery] = useState<VideoQuery>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useVideos(query);
  const { data: categories } = useVideoCategories();
  const { data: seriesList } = useVideoSeries();
  const createCategory = useCreateVideoCategory();
  const createSeries = useCreateVideoSeries();
  const deleteVideo = useDeleteVideo();

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VideoListItem | null>(null);

  const videos = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">動画管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            カテゴリ追加
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSeriesDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            シリーズ追加
          </Button>
          <Link href="/videos/new">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              アップロード
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
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
          value={query.publishStatus ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, publishStatus: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="published">公開</SelectItem>
            <SelectItem value="archived">アーカイブ</SelectItem>
          </SelectContent>
        </Select>
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

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : videos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Video className="mx-auto mb-4 h-12 w-12" />
          <p>動画がありません</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>シリーズ</TableHead>
              <TableHead>公開状態</TableHead>
              <TableHead>配信状態</TableHead>
              <TableHead>再生時間</TableHead>
              <TableHead>再生数</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((v: VideoListItem) => (
              <TableRow key={v.id}>
                <TableCell className="max-w-[240px]">
                  <Link href={`/videos/${v.id}`} className="font-medium hover:underline">
                    {v.title}
                  </Link>
                </TableCell>
                <TableCell>{v.category?.name ?? "-"}</TableCell>
                <TableCell>{v.series?.name ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {PUBLISH_STATUS_LABELS[v.publishStatus] ?? v.publishStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STREAM_STATUS_VARIANT[v.streamStatus] ?? "secondary"}
                    className="text-[10px]"
                  >
                    {STREAM_STATUS_LABELS[v.streamStatus] ?? v.streamStatus}
                  </Badge>
                </TableCell>
                <TableCell>{formatDuration(v.durationSeconds)}</TableCell>
                <TableCell>{v.viewCount}</TableCell>
                <TableCell>{formatDate(v.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push(`/videos/${v.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(v)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
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

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリ追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>カテゴリ名</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="カテゴリ名"
              />
            </div>
            <Button
              onClick={() => {
                createCategory.mutate(newCatName, {
                  onSuccess: () => {
                    setCatDialogOpen(false);
                    setNewCatName("");
                  },
                });
              }}
              disabled={!newCatName || createCategory.isPending}
              className="w-full"
            >
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Series Dialog */}
      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>シリーズ追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>シリーズ名</Label>
              <Input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="シリーズ名"
              />
            </div>
            <Button
              onClick={() => {
                createSeries.mutate(
                  { name: newSeriesName },
                  {
                    onSuccess: () => {
                      setSeriesDialogOpen(false);
                      setNewSeriesName("");
                    },
                  },
                );
              }}
              disabled={!newSeriesName || createSeries.isPending}
              className="w-full"
            >
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>動画を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteVideo.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
