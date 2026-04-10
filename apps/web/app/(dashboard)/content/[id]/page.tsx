"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useContent } from "@/hooks/content/use-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  archived: "アーカイブ",
};

const TYPE_LABELS: Record<string, string> = {
  article: "記事",
  course: "コース",
  document: "ドキュメント",
  other: "その他",
};

export default function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: content, isLoading } = useContent(id);
  const [copied, setCopied] = useState(false);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!content)
    return (
      <div className="py-12 text-center text-muted-foreground">コンテンツが見つかりません</div>
    );

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/content/share/${content.inviteToken}`
      : "";

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("URLをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

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
            <Badge variant="outline">
              {STATUS_LABELS[content.publishStatus] ?? content.publishStatus}
            </Badge>
            <Badge variant="secondary">
              {TYPE_LABELS[content.contentType] ?? content.contentType}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{content.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {content.createdBy.name} ・ {new Date(content.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <Link href={`/content/${content.id}/edit`}>
          <Button variant="outline" size="sm">
            編集
          </Button>
        </Link>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">共有URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded border bg-muted px-3 py-2 text-xs"
            />
            <Button size="sm" variant="outline" onClick={copyShareUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">招待トークン: {content.inviteToken}</p>
        </CardContent>
      </Card>
    </div>
  );
}
