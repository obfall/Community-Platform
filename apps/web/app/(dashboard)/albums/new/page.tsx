"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateAlbum, useAlbumCategories, useAddAlbumPhotos } from "@/hooks/albums/use-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { FileUploadList, type UploadedFileItem } from "@/components/file-upload-list";

const NONE_VALUE = "__none__";

export default function AlbumNewPage() {
  const router = useRouter();
  const createAlbum = useCreateAlbum();
  const addPhotos = useAddAlbumPhotos();
  const { data: categories } = useAlbumCategories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(NONE_VALUE);
  const [publishStatus, setPublishStatus] = useState("draft");
  const [photos, setPhotos] = useState<UploadedFileItem[]>([]);

  const submitting = createAlbum.isPending || addPhotos.isPending;

  const handleSubmit = async () => {
    const created = (await createAlbum.mutateAsync({
      title,
      description: description || undefined,
      categoryId: categoryId === NONE_VALUE ? undefined : categoryId,
      publishStatus,
    })) as { id: string };

    if (photos.length > 0) {
      await addPhotos.mutateAsync({
        albumId: created.id,
        photos: photos.map((p) => ({ fileId: p.fileId })),
      });
    }

    router.push(`/albums/${created.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/albums">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">アルバム作成</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="アルバムのタイトル"
              maxLength={200}
            />
          </div>
          <div>
            <Label>キャプション</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="アルバムのキャプション（任意）"
              rows={4}
            />
          </div>
          <div>
            <Label>カテゴリ</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>なし</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>公開ステータス</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
          <div>
            <Label>写真</Label>
            <FileUploadList
              value={photos}
              onChange={setPhotos}
              fileCategory="image"
              accept="image/*"
              maxSizeMB={10}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/albums">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!title || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
