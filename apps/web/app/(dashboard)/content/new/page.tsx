"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCreateContent } from "@/hooks/content/use-content";
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
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import type { ContentPublishStatus } from "@/lib/api/types";

export default function ContentNewPage() {
  const t = useTranslations("contents");
  const router = useRouter();
  const createContent = useCreateContent();

  const [name, setName] = useState("");
  const [contentType, setContentType] = useState("meal_drink");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [publishStatus, setPublishStatus] = useState<ContentPublishStatus>("draft");
  const [images, setImages] = useState<ProductImage[]>([]);

  const handleSubmit = () => {
    createContent.mutate(
      {
        name,
        contentType,
        description: description || undefined,
        price: price ? Number(price) : undefined,
        coverImageUrl: images[0]?.url,
        publishStatus,
      },
      { onSuccess: () => router.push("/content") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("new.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("new.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("new.coverImageLabel")}</Label>
            <ProductImageUpload value={images} onChange={setImages} />
          </div>
          <div>
            <Label>{t("new.nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("new.namePlaceholder")}
              maxLength={200}
            />
          </div>
          <div>
            <Label>{t("new.typeLabel")}</Label>
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
            <Label>{t("new.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("new.descriptionPlaceholder")}
              rows={4}
            />
          </div>
          <div>
            <Label>{t("new.priceLabel")}</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("new.pricePlaceholder")}
              min="0"
            />
          </div>
          <div>
            <Label>{t("new.publishStatusLabel")}</Label>
            <SelectField
              value={publishStatus}
              onChange={(v) => setPublishStatus(v as ContentPublishStatus)}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/content">
              <Button variant="outline">{t("new.cancel")}</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || createContent.isPending}>
              {createContent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("new.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
