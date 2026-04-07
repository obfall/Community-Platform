"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useContent, useUpdateContent } from "@/hooks/use-contents";
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
import type { ContentListItem } from "@/lib/api/types";

export default function ContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: content, isLoading } = useContent(id);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!content)
    return (
      <div className="py-12 text-center text-muted-foreground">コンテンツが見つかりません</div>
    );

  return <ContentEditForm id={id} content={content} />;
}

function ContentEditForm({ id, content }: { id: string; content: ContentListItem }) {
  const router = useRouter();
  const updateContent = useUpdateContent();

  const [name, setName] = useState(content.name);
  const [contentType, setContentType] = useState(content.contentType);
  const [description, setDescription] = useState(content.description ?? "");
  const [price, setPrice] = useState(content.price != null ? String(content.price) : "");
  const [publishStatus, setPublishStatus] = useState(content.publishStatus);
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
        <h1 className="text-2xl font-bold">コンテンツ編集</h1>
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
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
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
            <Link href={`/content/${id}`}>
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!name || updateContent.isPending}>
              {updateContent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
