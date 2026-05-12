"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useProducts,
  useDeleteProduct,
  useProductCategories,
  useCreateProductCategory,
  useProductSeries,
  useCreateProductSeries,
  useShopCapabilities,
} from "@/hooks/shop/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ShoppingBag } from "lucide-react";
import type { ProductQuery, ProductListItem } from "@/lib/api/types";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_LABELS, PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";

export default function ShopManagePage() {
  const router = useRouter();
  const [query, setQuery] = useState<ProductQuery>({ page: 1, limit: 20, publishStatus: "all" });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProducts(query);
  const { data: categories } = useProductCategories();
  const { data: seriesList } = useProductSeries();
  const createCategory = useCreateProductCategory();
  const createSeries = useCreateProductSeries();
  const deleteProduct = useDeleteProduct();
  const { data: capabilities } = useShopCapabilities();

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  const products = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            カテゴリ追加
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSeriesDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            シリーズ追加
          </Button>
          {capabilities?.canCreateProduct && (
            <Link href="/shop/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                商品登録
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((p) => ({ ...p, search: v || undefined, page: 1 }))}
          placeholder="商品を検索..."
          className="max-w-xs"
        />
        <SelectField
          value={query.publishStatus ?? "all"}
          onChange={(v) => setQuery((p) => ({ ...p, publishStatus: v, page: 1 }))}
          options={PUBLISH_STATUS_OPTIONS}
          includeAll
          placeholder="ステータス"
          className="w-36"
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
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12" />
          <p>商品がありません</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>シリーズ</TableHead>
              <TableHead>価格</TableHead>
              <TableHead>在庫</TableHead>
              <TableHead>公開状態</TableHead>
              <TableHead>販売数</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-[240px]">
                  <Link href={`/shop/${p.id}?from=manage`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.category?.name ?? "-"}</TableCell>
                <TableCell>{p.series?.name ?? "-"}</TableCell>
                <TableCell>¥{p.price.toLocaleString()}</TableCell>
                <TableCell>{p.stock != null ? p.stock : "無制限"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {PUBLISH_STATUS_LABELS[p.publishStatus] ?? p.publishStatus}
                  </Badge>
                </TableCell>
                <TableCell>{p.salesCount}</TableCell>
                <TableCell>{new Date(p.createdAt).toLocaleDateString("ja-JP")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push(`/shop/${p.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {meta && (
        <PaginationBar meta={meta} onPageChange={(page) => setQuery((p) => ({ ...p, page }))} />
      )}

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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteProduct.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
