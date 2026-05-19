"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useVideos,
  useVideoSeries,
  useCreateVideoSeries,
  useDeleteVideo,
} from "@/hooks/videos/use-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, Plus, Pencil, Trash2, Video, MoreHorizontal } from "lucide-react";
import type { VideoListItem, VideoQuery } from "@/lib/api/types";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";

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
  const t = useTranslations("videos.manage");
  const tPublish = useTranslations("enums.publishStatus");
  const tStream = useTranslations("enums.videoStreamStatus");
  const [query, setQuery] = useState<VideoQuery>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useVideos(query);
  const { data: seriesList } = useVideoSeries();
  const createSeries = useCreateVideoSeries();
  const deleteVideo = useDeleteVideo();

  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VideoListItem | null>(null);

  const videos = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/videos/new")}>
              <Upload className="mr-2 h-3.5 w-3.5" />
              {t("uploadAction")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSeriesDialogOpen(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              {t("addSeriesAction")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((p) => ({ ...p, search: v || undefined, page: 1 }))}
          placeholder={t("searchPlaceholder")}
          className="max-w-xs"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SelectField
            value={query.publishStatus ?? "all"}
            onChange={(v) =>
              setQuery((p) => ({ ...p, publishStatus: v === "all" ? undefined : v, page: 1 }))
            }
            options={PUBLISH_STATUS_OPTIONS}
            includeAll
            placeholder={t("statusPlaceholder")}
            className="w-36"
          />
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
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : videos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Video className="mx-auto mb-4 h-12 w-12" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.title")}</TableHead>
              <TableHead>{t("table.series")}</TableHead>
              <TableHead>{t("table.publishStatus")}</TableHead>
              <TableHead>{t("table.streamStatus")}</TableHead>
              <TableHead>{t("table.duration")}</TableHead>
              <TableHead>{t("table.viewCount")}</TableHead>
              <TableHead>{t("table.createdAt")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
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
                <TableCell>{v.series?.name ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {tPublish.has(v.publishStatus) ? tPublish(v.publishStatus) : v.publishStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STREAM_STATUS_VARIANT[v.streamStatus] ?? "secondary"}
                    className="text-[10px]"
                  >
                    {tStream.has(v.streamStatus) ? tStream(v.streamStatus) : v.streamStatus}
                  </Badge>
                </TableCell>
                <TableCell>{formatDuration(v.durationSeconds)}</TableCell>
                <TableCell>{v.viewCount}</TableCell>
                <TableCell>{formatDate(v.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="hidden justify-end gap-1 xl:flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push(`/videos/${v.id}/edit`)}
                      aria-label={t("editAction")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(v)}
                      aria-label={t("deleteAction")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="xl:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/videos/${v.id}/edit`)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          {t("editAction")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(v)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          {t("deleteAction")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {meta && (
        <PaginationBar meta={meta} onPageChange={(page) => setQuery((p) => ({ ...p, page }))} />
      )}

      {/* Series Dialog */}
      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("seriesDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("seriesDialog.nameLabel")}</Label>
              <Input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder={t("seriesDialog.namePlaceholder")}
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
              {t("seriesDialog.createAction")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
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
              {t("deleteDialog.action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
