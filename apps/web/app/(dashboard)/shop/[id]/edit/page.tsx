"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useProduct,
  useUpdateProduct,
  useProductCategories,
  useProductSeries,
} from "@/hooks/shop/use-shop";
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
import type { ProductListItem } from "@/lib/api/types";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";

const NONE_VALUE = "__none__";

export default function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("shop.edit");
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
  if (!product)
    return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>;

  return <ProductEditForm id={id} product={product as unknown as ProductWithImages} />;
}

type ProductWithImages = ProductListItem & {
  images?: Array<{ id: string; fileId: string; file: { id: string; publicUrl: string | null } }>;
};

function toLocalDatetime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function ProductEditForm({ id, product }: { id: string; product: ProductWithImages }) {
  const t = useTranslations("shop.edit");
  const router = useRouter();
  const updateProduct = useUpdateProduct();
  const { data: categories } = useProductCategories();
  const { data: seriesList } = useProductSeries();

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(product.stock != null ? String(product.stock) : "");
  const [categoryId, setCategoryId] = useState(product.category?.id ?? NONE_VALUE);
  const [seriesId, setSeriesId] = useState(product.series?.id ?? NONE_VALUE);
  const [publishStatus, setPublishStatus] = useState(product.publishStatus);
  const [saleStartAt, setSaleStartAt] = useState(toLocalDatetime(product.saleStartAt));
  const [saleEndAt, setSaleEndAt] = useState(toLocalDatetime(product.saleEndAt));
  const [images, setImages] = useState<ProductImage[]>(
    (product.images ?? [])
      .filter((img) => img.file.publicUrl)
      .map((img) => ({ fileId: img.fileId, url: img.file.publicUrl! })),
  );

  const handleSubmit = () => {
    updateProduct.mutate(
      {
        id,
        data: {
          name,
          description: description || null,
          price: Number(price),
          stock: stock ? Number(stock) : null,
          categoryId: categoryId === NONE_VALUE ? null : categoryId,
          seriesId: seriesId === NONE_VALUE ? null : seriesId,
          publishStatus,
          saleStartAt: saleStartAt ? new Date(saleStartAt).toISOString() : null,
          saleEndAt: saleEndAt ? new Date(saleEndAt).toISOString() : null,
          imageFileIds: images.map((i) => i.fileId),
        },
      },
      { onSuccess: () => router.push("/shop/manage") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/shop/manage">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("imageLabel")}</Label>
            <ProductImageUpload value={images} onChange={setImages} />
          </div>
          <div>
            <Label>{t("nameLabel")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>{t("descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("priceLabel")}</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label>{t("stockLabel")}</Label>
              <Input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder={t("stockPlaceholder")}
                min="0"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("categoryLabel")}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>{t("categoryNone")}</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("seriesLabel")}</Label>
              <Select value={seriesId} onValueChange={setSeriesId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>{t("seriesNone")}</SelectItem>
                  {seriesList?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("publishStatusLabel")}</Label>
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("saleStartLabel")}</Label>
              <Input
                type="datetime-local"
                value={saleStartAt}
                onChange={(e) => setSaleStartAt(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("saleEndLabel")}</Label>
              <Input
                type="datetime-local"
                value={saleEndAt}
                onChange={(e) => setSaleEndAt(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/shop/manage">
              <Button variant="outline">{t("cancel")}</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || !price || updateProduct.isPending}>
              {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
