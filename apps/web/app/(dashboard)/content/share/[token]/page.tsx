"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { contentsApi } from "@/lib/api/contents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  article: "記事",
  course: "コース",
  document: "ドキュメント",
  other: "その他",
};

export default function ContentSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: content, isLoading } = useQuery({
    queryKey: ["contents", "share", token],
    queryFn: () => contentsApi.getByToken(token),
  });

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!content)
    return (
      <div className="py-12 text-center text-muted-foreground">コンテンツが見つかりません</div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="secondary">
              {TYPE_LABELS[content.contentType] ?? content.contentType}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{content.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {content.createdBy.name} ・ {new Date(content.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {content.coverImageUrl ? (
            <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.coverImageUrl}
                alt={content.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-muted">
              <FileText className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {content.description && (
            <div className="whitespace-pre-wrap text-sm">{content.description}</div>
          )}

          {content.price != null && content.price > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="text-2xl font-bold">¥{content.price.toLocaleString()}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
