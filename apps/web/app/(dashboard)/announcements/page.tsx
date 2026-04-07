"use client";

import Link from "next/link";
import { useAnnouncements } from "@/hooks/use-announcements";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, Pin } from "lucide-react";

export default function AnnouncementsPage() {
  const { data, isLoading } = useAnnouncements();
  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">お知らせ</h1>
        <Link href="/announcements/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Megaphone className="mx-auto mb-4 h-12 w-12" />
          <p>お知らせがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const isPinned = a.pinnedUntil && new Date(a.pinnedUntil) > new Date();
            return (
              <Link key={a.id} href={`/announcements/${a.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      {isPinned && (
                        <Badge variant="default" className="text-xs">
                          <Pin className="mr-1 h-3 w-3" />
                          ピン留め
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {a.targetAudience === "all"
                          ? "全員"
                          : a.targetAudience === "admin"
                            ? "管理者"
                            : "メンバー"}
                      </Badge>
                      {!a.isPublished && (
                        <Badge variant="secondary" className="text-xs">
                          下書き
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-base font-semibold">{a.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                      <span>{a.createdBy?.name}</span>
                      <span>
                        {a.publishedAt
                          ? new Date(a.publishedAt).toLocaleDateString("ja-JP")
                          : new Date(a.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
