"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAlbum, useUpdateAlbum, useAlbumCategories } from "@/hooks/albums/use-albums";
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
import type { AlbumDetail, AlbumPublishStatus } from "@/lib/api/types";

const NONE_VALUE = "__none__";

export default function AlbumEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("albums");
  const tCommon = useTranslations("common");
  const { id } = use(params);
  const { data, isLoading } = useAlbum(id);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>;
  if (!data)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.notFound")}</div>;

  return <AlbumEditForm id={id} album={data} />;
}

function AlbumEditForm({ id, album }: { id: string; album: AlbumDetail }) {
  const t = useTranslations("albums");
  const router = useRouter();
  const updateAlbum = useUpdateAlbum();
  const { data: categories } = useAlbumCategories();

  const [title, setTitle] = useState(album.title);
  const [description, setDescription] = useState(album.description ?? "");
  const [categoryId, setCategoryId] = useState(album.category?.id ?? NONE_VALUE);
  const [publishStatus, setPublishStatus] = useState<AlbumPublishStatus>(album.publishStatus);

  const handleSubmit = () => {
    updateAlbum.mutate(
      {
        id,
        data: {
          title,
          description: description || null,
          categoryId: categoryId === NONE_VALUE ? null : categoryId,
          publishStatus,
        },
      },
      { onSuccess: () => router.push(`/albums/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/albums/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("edit.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("edit.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("edit.titleLabel")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>{t("edit.captionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>{t("edit.categoryLabel")}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{t("edit.categoryNone")}</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("edit.publishStatusLabel")}</Label>
            <SelectField
              value={publishStatus}
              onChange={(v) => setPublishStatus(v as AlbumPublishStatus)}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/albums/${id}`}>
              <Button variant="outline">{t("edit.cancel")}</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!title || updateAlbum.isPending}>
              {updateAlbum.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("edit.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
