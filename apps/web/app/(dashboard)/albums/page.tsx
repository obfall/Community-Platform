"use client";

import { useState } from "react";
import Link from "next/link";
import { useAlbums } from "@/hooks/use-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Image as ImageIcon, Camera } from "lucide-react";

export default function AlbumsPage() {
  const [query, setQuery] = useState<{ page?: number; limit?: number; search?: string }>({
    page: 1,
    limit: 12,
  });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAlbums(query);
  const albums = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">アルバム</h1>
        <Link href="/albums/new">
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
          placeholder="アルバムを検索..."
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : albums.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ImageIcon className="mx-auto mb-4 h-12 w-12" />
          <p>アルバムがありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((a) => (
            <Link key={a.id} href={`/albums/${a.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex h-40 items-center justify-center rounded-t-lg bg-muted">
                    {a.coverPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.coverPhotoUrl}
                        alt={a.title}
                        className="h-full w-full rounded-t-lg object-cover"
                      />
                    ) : (
                      <Camera className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      {a.category && (
                        <Badge variant="secondary" className="text-xs">
                          {a.category.name}
                        </Badge>
                      )}
                    </div>
                    <h3 className="line-clamp-1 text-sm font-semibold">{a.title}</h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        {a.photoCount}枚
                      </span>
                      <span>{a.createdBy.name}</span>
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
