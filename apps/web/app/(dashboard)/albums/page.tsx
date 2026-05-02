"use client";

import { useState } from "react";
import Link from "next/link";
import { useAlbums, useAlbumCategories, useCreateAlbumCategory } from "@/hooks/albums/use-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Image as ImageIcon, Camera } from "lucide-react";
import { HighlightedText } from "@/components/highlighted-text";

export default function AlbumsPage() {
  const [query, setQuery] = useState<{
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  }>({
    page: 1,
    limit: 12,
  });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAlbums(query);
  const { data: categories } = useAlbumCategories();
  const createCategory = useCreateAlbumCategory();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const albums = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">アルバム</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            カテゴリ追加
          </Button>
          <Link href="/albums/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              作成
            </Button>
          </Link>
        </div>
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
        <Select
          value={query.categoryId ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, categoryId: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのカテゴリ</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリ追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>カテゴリ名</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="カテゴリ名"
              />
            </div>
            <Button
              className="w-full"
              disabled={!newCatName || createCategory.isPending}
              onClick={() => {
                createCategory.mutate(newCatName, {
                  onSuccess: () => {
                    setCatDialogOpen(false);
                    setNewCatName("");
                  },
                });
              }}
            >
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <div className="flex h-40 items-center justify-center bg-muted">
                  {a.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.coverPhotoUrl}
                      alt={a.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    {a.category && (
                      <Badge variant="secondary" className="text-xs">
                        {a.category.name}
                      </Badge>
                    )}
                  </div>
                  <h3 className="line-clamp-1 text-sm font-semibold">
                    <HighlightedText html={a.titleHighlighted} fallback={a.title} />
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {a.photoCount}枚
                    </span>
                    <span>{a.createdBy.name}</span>
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
