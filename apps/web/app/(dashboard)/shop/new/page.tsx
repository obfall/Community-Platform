"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCreateProduct,
  useProductCategories,
  useProductSeries,
  useShopCapabilities,
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
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";

const NONE_VALUE = "__none__";

export default function ProductNewPage() {
  const router = useRouter();
  const { data: capabilities, isLoading: capLoading } = useShopCapabilities();

  useEffect(() => {
    if (!capLoading && capabilities && !capabilities.canCreateProduct) {
      router.replace("/shop");
    }
  }, [capLoading, capabilities, router]);

  if (capLoading || !capabilities?.canCreateProduct) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  return <ProductNewForm />;
}

function ProductNewForm() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const { data: categories } = useProductCategories();
  const { data: seriesList } = useProductSeries();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState(NONE_VALUE);
  const [seriesId, setSeriesId] = useState(NONE_VALUE);
  const [publishStatus, setPublishStatus] = useState("draft");
  const [saleStartAt, setSaleStartAt] = useState("");
  const [saleEndAt, setSaleEndAt] = useState("");
  const [images, setImages] = useState<ProductImage[]>([]);

  const handleSubmit = () => {
    createProduct.mutate(
      {
        name,
        description: description || undefined,
        price: Number(price),
        stock: stock ? Number(stock) : undefined,
        categoryId: categoryId === NONE_VALUE ? undefined : categoryId,
        seriesId: seriesId === NONE_VALUE ? undefined : seriesId,
        saleStartAt: saleStartAt || undefined,
        saleEndAt: saleEndAt || undefined,
        publishStatus,
        imageFileIds: images.map((i) => i.fileId),
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
        <h1 className="text-2xl font-bold">商品登録</h1>
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="商品名を入力"
              maxLength={200}
            />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="商品の説明（任意）"
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
                placeholder="1000"
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
            <SelectField
              value={publishStatus}
              onChange={setPublishStatus}
              options={PUBLISH_STATUS_OPTIONS}
            />
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
            <Button onClick={handleSubmit} disabled={!name || !price || createProduct.isPending}>
              {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登録
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
