"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useContent, useUpdateContent } from "@/hooks/content/use-content";
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
import { ProductImageUpload, type ProductImage } from "@/components/product-image-upload";
import type { ContentDetail, ContentPublishStatus } from "@/lib/api/types";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";

export default function ContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("contents");
  const tCommon = useTranslations("common");
  const { id } = use(params);
  const { data: content, isLoading } = useContent(id);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>;
  if (!content)
    return <div className="py-12 text-center text-muted-foreground">{t("detail.notFound")}</div>;

  return <ContentEditForm id={id} content={content} />;
}

function ContentEditForm({ id, content }: { id: string; content: ContentDetail }) {
  const t = useTranslations("contents");
  const router = useRouter();
  const updateContent = useUpdateContent();

  const [name, setName] = useState(content.name);
  const [contentType, setContentType] = useState(content.contentType);
  const [description, setDescription] = useState(content.description ?? "");
  const [price, setPrice] = useState(content.price != null ? String(content.price) : "");
  const [publishStatus, setPublishStatus] = useState<ContentPublishStatus>(content.publishStatus);
  const [images, setImages] = useState<ProductImage[]>(
    content.coverImageUrl ? [{ fileId: "existing", url: content.coverImageUrl }] : [],
  );

  const handleSubmit = () => {
    updateContent.mutate(
      {
        id,
        data: {
          name,
          contentType,
          description: description || null,
          price: price ? Number(price) : null,
          coverImageUrl: images[0]?.url ?? null,
          publishStatus,
        },
      },
      { onSuccess: () => router.push(`/content/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/content/${id}`}>
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
            <Label>{t("edit.coverImageLabel")}</Label>
            <ProductImageUpload value={images} onChange={setImages} />
          </div>
          <div>
            <Label>{t("edit.nameLabel")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>{t("edit.typeLabel")}</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meal_drink">{t("type.meal_drink")}</SelectItem>
                <SelectItem value="product">{t("type.product")}</SelectItem>
                <SelectItem value="tourist_spot">{t("type.tourist_spot")}</SelectItem>
                <SelectItem value="room_space">{t("type.room_space")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("edit.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>{t("edit.priceLabel")}</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("edit.pricePlaceholder")}
              min="0"
            />
          </div>
          <div>
            <Label>{t("edit.publishStatusLabel")}</Label>
            <SelectField
              value={publishStatus}
              onChange={(v) => setPublishStatus(v as ContentPublishStatus)}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/content/${id}`}>
              <Button variant="outline">{t("edit.cancel")}</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || updateContent.isPending}>
              {updateContent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("edit.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
