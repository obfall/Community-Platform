"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAlbum, useAddAlbumPhotos, useRemoveAlbumPhoto } from "@/hooks/albums/use-albums";
import { filesApi } from "@/lib/api/files";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const PHOTO_MAX_SIZE_MB = 10;
const PHOTO_MAX_SIZE_BYTES = PHOTO_MAX_SIZE_MB * 1024 * 1024;

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("albums");
  const tCommon = useTranslations("common");
  const { id } = use(params);
  const { data: album, isLoading } = useAlbum(id);
  const addPhotos = useAddAlbumPhotos();
  const removePhoto = useRemoveAlbumPhoto();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>;
  if (!album)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.notFound")}</div>;

  const validPhotos = album.photos?.filter((p) => p.file.publicUrl) ?? [];
  const statusLabel = t(`status.${album.publishStatus}`);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const photos: Array<{ fileId: string }> = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(t("toast.photoNotImage", { name: file.name }));
          continue;
        }
        if (file.size > PHOTO_MAX_SIZE_BYTES) {
          toast.error(t("toast.photoTooLarge", { name: file.name, limitMB: PHOTO_MAX_SIZE_MB }));
          continue;
        }
        const result = await filesApi.upload(file, "image", true);
        photos.push({ fileId: result.id });
      }
      if (photos.length > 0) {
        addPhotos.mutate({ albumId: id, photos });
      }
    } catch {
      toast.error(t("toast.photoUploadFailed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/albums">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="outline">{statusLabel || album.publishStatus}</Badge>
            {album.category && <Badge variant="secondary">{album.category.name}</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{album.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("detail.metaLine", {
              createdBy: album.createdBy.name,
              count: album.photoCount,
              date: new Date(album.createdAt).toLocaleDateString("ja-JP"),
            })}
          </p>
        </div>
        <Link href={`/albums/${album.id}/edit`}>
          <Button variant="outline" size="sm">
            {t("detail.edit")}
          </Button>
        </Link>
      </div>

      {album.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("detail.captionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{album.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("detail.photosTitle")}</h2>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={uploading} size="sm">
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {t("detail.addPhotos")}
        </Button>
      </div>

      {validPhotos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Camera className="mx-auto mb-4 h-12 w-12" />
          <p>{t("detail.noPhotos")}</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {validPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.file.publicUrl!}
                alt={photo.title ?? photo.file.originalName}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
              <button
                type="button"
                onClick={() => removePhoto.mutate({ albumId: id, photoId: photo.id })}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                aria-label={t("detail.photoDeleteLabel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
