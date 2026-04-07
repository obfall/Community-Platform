"use client";

import { useState } from "react";
import Link from "next/link";
import { useProducts } from "@/hooks/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ShoppingBag, Package } from "lucide-react";
import type { ProductQuery } from "@/lib/api/types";

export default function ShopPage() {
  const [query, setQuery] = useState<ProductQuery>({ page: 1, limit: 12 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProducts(query);
  const products = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ショップ</h1>
        <Link href="/shop/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            商品登録
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
          placeholder="商品を検索..."
          className="max-w-xs"
        />
      </div>

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
                    <div className="mb-2 flex items-center gap-2">
                      {p.category && (
                        <Badge variant="secondary" className="text-xs">
                          {p.category.name}
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
