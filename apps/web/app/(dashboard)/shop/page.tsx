"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useProducts,
  useProductCategories,
  useCreateProductCategory,
  useProductSeries,
  useCreateProductSeries,
} from "@/hooks/use-shop";
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
import { Plus, ShoppingBag, Package } from "lucide-react";
import type { ProductQuery } from "@/lib/api/types";

export default function ShopPage() {
  const [query, setQuery] = useState<ProductQuery>({ page: 1, limit: 12, publishStatus: "all" });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProducts(query);
  const { data: categories } = useProductCategories();
  const { data: seriesList } = useProductSeries();
  const createCategory = useCreateProductCategory();
  const createSeries = useCreateProductSeries();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const products = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ショップ</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            カテゴリ追加
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSeriesDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            シリーズ追加
          </Button>
          <Link href="/shop/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              商品登録
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
          placeholder="商品を検索..."
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
        <Select
          value={query.seriesId ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, seriesId: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="シリーズ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのシリーズ</SelectItem>
            {seriesList?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
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

      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>シリーズ追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>シリーズ名</Label>
              <Input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="シリーズ名"
              />
            </div>
            <Button
              className="w-full"
              disabled={!newSeriesName || createSeries.isPending}
              onClick={() => {
                createSeries.mutate(newSeriesName, {
                  onSuccess: () => {
                    setSeriesDialogOpen(false);
                    setNewSeriesName("");
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
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12" />
          <p>商品がありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <Link key={p.id} href={`/shop/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex h-40 items-center justify-center rounded-t-lg bg-muted">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full rounded-t-lg object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      {p.publishStatus !== "published" && (
                        <Badge variant="secondary" className="text-xs">
                          {p.publishStatus === "draft" ? "下書き" : "アーカイブ"}
                        </Badge>
                      )}
                      {p.category && (
                        <Badge variant="secondary" className="text-xs">
                          {p.category.name}
                        </Badge>
                      )}
                      {p.series && (
                        <Badge variant="outline" className="text-xs">
                          {p.series.name}
                        </Badge>
                      )}
                      {p.stock !== null && p.stock <= 0 && (
                        <Badge variant="destructive" className="text-xs">
                          売切
                        </Badge>
                      )}
                      {p.stock !== null && p.stock > 0 && p.stock <= 5 && (
                        <Badge variant="outline" className="text-xs">
                          残り{p.stock}
                        </Badge>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold">&yen;{p.price.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">{p.salesCount}件販売</span>
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
