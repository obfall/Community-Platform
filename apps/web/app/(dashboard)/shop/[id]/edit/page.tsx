"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useProduct,
  useUpdateProduct,
  useProductCategories,
  useProductSeries,
} from "@/hooks/use-shop";
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

const NONE_VALUE = "__none__";

export default function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!product)
    return <div className="py-12 text-center text-muted-foreground">商品が見つかりません</div>;

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
      { onSuccess: () => router.push("/shop") },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/shop">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">商品編集</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>商品画像</Label>
            <ProductImageUpload value={images} onChange={setImages} />
          </div>
          <div>
            <Label>商品名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>価格（円）</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label>在庫数</Label>
              <Input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="無制限の場合は空欄"
                min="0"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label>シリーズ</Label>
              <Select value={seriesId} onValueChange={setSeriesId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>なし</SelectItem>
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
            <Label>公開ステータス</Label>
            <Select value={publishStatus} onValueChange={setPublishStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="published">公開</SelectItem>
                <SelectItem value="archived">アーカイブ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>販売開始日</Label>
              <Input
                type="datetime-local"
                value={saleStartAt}
                onChange={(e) => setSaleStartAt(e.target.value)}
              />
            </div>
            <div>
              <Label>販売終了日</Label>
              <Input
                type="datetime-local"
                value={saleEndAt}
                onChange={(e) => setSaleEndAt(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/shop">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || !price || updateProduct.isPending}>
              {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
