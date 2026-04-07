"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateContent } from "@/hooks/use-contents";
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

export default function ContentNewPage() {
  const router = useRouter();
  const createContent = useCreateContent();

  const [name, setName] = useState("");
  const [contentType, setContentType] = useState("article");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [publishStatus, setPublishStatus] = useState("draft");
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
        <h1 className="text-2xl font-bold">コンテンツ作成</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>カバー画像</Label>
            <ProductImageUpload value={images} onChange={setImages} />
          </div>
          <div>
            <Label>名前</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="コンテンツ名を入力"
              maxLength={200}
            />
          </div>
          <div>
            <Label>種別</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="article">記事</SelectItem>
                <SelectItem value="course">コース</SelectItem>
                <SelectItem value="document">ドキュメント</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="コンテンツの説明（任意）"
              rows={4}
            />
          </div>
          <div>
            <Label>価格（円）</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="無料の場合は空欄"
              min="0"
            />
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
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/content">
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || createContent.isPending}>
              {createContent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
