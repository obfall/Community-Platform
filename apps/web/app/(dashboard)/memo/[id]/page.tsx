"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemoDetail, useDeleteMemo } from "@/hooks/use-memos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Trash2, Paperclip } from "lucide-react";

export default function MemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useMemoDetail(id);
  const deleteMemo = useDeleteMemo();

  const handleDelete = () => {
    if (confirm("本当に削除しますか?")) {
      deleteMemo.mutate(id, { onSuccess: () => router.push("/memo") });
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">メモが見つかりません</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/memo">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/memo/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {data.category && <Badge variant="outline">{data.category.name}</Badge>}
          <h1 className="text-2xl font-bold">{data.title}</h1>
          {data.body && (
            <div className="prose max-w-none whitespace-pre-wrap text-sm">{data.body}</div>
          )}
          {data.attachments && data.attachments.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">添付ファイル</h3>
              {data.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.file.publicUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Paperclip className="h-3 w-3" />
                  {a.file.originalName}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
