"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAnnouncement, useDeleteAnnouncement } from "@/hooks/use-announcements";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Trash2, Pin } from "lucide-react";

export default function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useAnnouncement(id);
  const deleteAnnouncement = useDeleteAnnouncement();

  const handleDelete = () => {
    if (confirm("本当に削除しますか?")) {
      deleteAnnouncement.mutate(id, { onSuccess: () => router.push("/announcements") });
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">お知らせが見つかりません</div>;
  }

  const isPinned = data.pinnedUntil && new Date(data.pinnedUntil) > new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/announcements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/announcements/${id}/edit`}>
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
          <div className="flex flex-wrap items-center gap-2">
            {isPinned && (
              <Badge variant="default">
                <Pin className="mr-1 h-3 w-3" />
                ピン留め
              </Badge>
            )}
            <Badge variant="outline">
              {data.targetAudience === "all"
                ? "全員"
                : data.targetAudience === "admin"
                  ? "管理者"
                  : "メンバー"}
            </Badge>
            {!data.isPublished && <Badge variant="secondary">下書き</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <div className="text-xs text-muted-foreground">
            {data.createdBy?.name} ・{" "}
            {data.publishedAt
              ? new Date(data.publishedAt).toLocaleString("ja-JP")
              : new Date(data.createdAt).toLocaleString("ja-JP")}
          </div>
          <div className="prose max-w-none whitespace-pre-wrap text-sm">{data.body}</div>
        </CardContent>
      </Card>
    </div>
  );
}
