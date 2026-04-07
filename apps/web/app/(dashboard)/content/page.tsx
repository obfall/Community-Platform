"use client";

import { useState } from "react";
import Link from "next/link";
import { useContents } from "@/hooks/use-contents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, BookOpen } from "lucide-react";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  article: "記事",
  course: "コース",
  document: "ドキュメント",
  other: "その他",
};

export default function ContentPage() {
  const [query, setQuery] = useState<{
    page?: number;
    limit?: number;
    search?: string;
    contentType?: string;
    publishStatus?: string;
  }>({ page: 1, limit: 12, publishStatus: "all" });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useContents(query);
  const contents = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">コンテンツ</h1>
        <Link href="/content/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            作成
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && setQuery((p) => ({ ...p, search: search || undefined, page: 1 }))
          }
          placeholder="コンテンツを検索..."
          className="max-w-xs"
        />
        <Select
          value={query.contentType ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, contentType: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="種別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="article">記事</SelectItem>
            <SelectItem value="course">コース</SelectItem>
            <SelectItem value="document">ドキュメント</SelectItem>
            <SelectItem value="other">その他</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={query.publishStatus ?? "all"}
          onValueChange={(v) => setQuery((p) => ({ ...p, publishStatus: v, page: 1 }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="published">公開</SelectItem>
            <SelectItem value="archived">アーカイブ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : contents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-4 h-12 w-12" />
          <p>コンテンツがありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contents.map((c) => (
            <Link key={c.id} href={`/content/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex h-36 items-center justify-center rounded-t-lg bg-muted">
                    {c.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.coverImageUrl}
                        alt={c.name}
                        className="h-full w-full rounded-t-lg object-cover"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {CONTENT_TYPE_LABELS[c.contentType] ?? c.contentType}
                      </Badge>
                      <Badge
                        variant={c.publishStatus === "published" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {c.publishStatus === "published" ? "公開" : "下書き"}
                      </Badge>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>{c.createdBy.name}</span>
                      {c.price != null && (
                        <span className="font-semibold text-foreground">
                          &yen;{c.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
            disabled={!meta.hasPreviousPage}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            disabled={!meta.hasNextPage}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
