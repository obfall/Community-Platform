"use client";

import { use } from "react";
import Link from "next/link";
import { useAlbum } from "@/hooks/use-albums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  archived: "アーカイブ",
};

interface AlbumDetail {
  id: string;
  title: string;
  description: string | null;
  publishStatus: string;
  photoCount: number;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  photos: Array<{
    id: string;
    title: string | null;
    caption: string | null;
    file: { id: string; publicUrl: string | null; originalName: string };
  }>;
}

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useAlbum(id);
  const album = data as AlbumDetail | undefined;

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!album)
    return <div className="py-12 text-center text-muted-foreground">アルバムが見つかりません</div>;

  const validPhotos = album.photos?.filter((p) => p.file.publicUrl) ?? [];

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
            <Badge variant="outline">
              {STATUS_LABELS[album.publishStatus] ?? album.publishStatus}
            </Badge>
            {album.category && <Badge variant="secondary">{album.category.name}</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{album.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {album.createdBy.name} ・ {album.photoCount}枚 ・{" "}
            {new Date(album.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <Link href={`/albums/${album.id}/edit`}>
          <Button variant="outline" size="sm">
            編集
          </Button>
        </Link>
      </div>

      {album.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">概要</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{album.description}</p>
          </CardContent>
        </Card>
      )}

      {validPhotos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Camera className="mx-auto mb-4 h-12 w-12" />
          <p>写真がありません</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {validPhotos.map((photo) => (
            <div key={photo.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.file.publicUrl!}
                alt={photo.title ?? photo.file.originalName}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
