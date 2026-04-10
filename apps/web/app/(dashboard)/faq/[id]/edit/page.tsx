"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFaqArticle, useUpdateFaq } from "@/hooks/faq/use-faq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { FaqArticle } from "@/lib/api/types";

export default function FaqEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useFaqArticle(id);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">FAQが見つかりません</div>;
  }
  return <Form id={id} initial={data} />;
}

function Form({ id, initial }: { id: string; initial: FaqArticle }) {
  const router = useRouter();
  const updateFaq = useUpdateFaq();

  const [category, setCategory] = useState(initial.category);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [isPublished, setIsPublished] = useState(initial.isPublished);

  const handleSubmit = () => {
    updateFaq.mutate(
      {
        id,
        data: { category, title, body, sortOrder: Number(sortOrder) || 0, isPublished },
      },
      { onSuccess: () => router.push(`/faq/${id}`) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/faq/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">FAQ編集</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>カテゴリ</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={50} />
          </div>
          <div>
            <Label>タイトル</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>本文</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>
          <div>
            <Label>並び順</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>公開する</Label>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/faq/${id}`}>
              <Button variant="outline">キャンセル</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={!category || !title || !body || updateFaq.isPending}
            >
              {updateFaq.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              更新
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
