"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useSellerProducts,
  useSellerOrders,
  useSellerSummary,
  useShopCapabilities,
  useDeleteProduct,
} from "@/hooks/shop/use-shop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Receipt, Package } from "lucide-react";
import type { ProductListItem } from "@/lib/api/types";
import { PUBLISH_STATUS_LABELS } from "@/lib/constants/publish-status";
import { OrderStatusBadge } from "../_components/order-status-badge";

export default function SellerDashboardPage() {
  const router = useRouter();
  const { data: capabilities, isLoading: capLoading } = useShopCapabilities();

  useEffect(() => {
    if (!capLoading && capabilities && !capabilities.canCreateProduct) {
      router.replace("/shop");
    }
  }, [capLoading, capabilities, router]);

  if (capLoading || !capabilities?.canCreateProduct) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  return <SellerDashboard />;
}

function SellerDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">販売管理</h1>
        <Link href="/shop/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            商品登録
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">サマリー</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="orders">注文</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <SummaryTab />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: summary, isLoading } = useSellerSummary({
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>開始日</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>終了日</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            クリア
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">売上合計（完了分）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                &yen;{(summary?.totalRevenue ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">総注文数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.orderCount ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">ステータス別</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>申込中</span>
                <span className="font-semibold">{summary?.inProgressCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>取引中</span>
                <span className="font-semibold">{summary?.inNegotiationCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>完了</span>
                <span className="font-semibold">{summary?.completedCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>キャンセル</span>
                <span className="font-semibold">{summary?.canceledCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ProductsTab() {
  const router = useRouter();
  const { data, isLoading } = useSellerProducts({ page: 1, limit: 50, publishStatus: "all" });
  const deleteProduct = useDeleteProduct();
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  const products = data?.data ?? [];

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Package className="mx-auto mb-4 h-12 w-12" />
        <p>出品中の商品がありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品名</TableHead>
              <TableHead>価格</TableHead>
              <TableHead>在庫</TableHead>
              <TableHead>公開状態</TableHead>
              <TableHead>販売数</TableHead>
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
                <TableCell>&yen;{p.price.toLocaleString()}</TableCell>
                <TableCell>{p.stock != null ? p.stock : "無制限"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {PUBLISH_STATUS_LABELS[p.publishStatus] ?? p.publishStatus}
                  </Badge>
                </TableCell>
                <TableCell>{p.salesCount}</TableCell>
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
                      className="h-8 w-8"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
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
              onClick={() => {
                if (deleteTarget) {
                  deleteProduct.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: orders, isLoading } = useSellerOrders(
    statusFilter === "all" ? undefined : statusFilter,
  );

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="in_progress">申込中</TabsTrigger>
          <TabsTrigger value="in_negotiation">取引中</TabsTrigger>
          <TabsTrigger value="completed">完了</TabsTrigger>
          <TabsTrigger value="canceled">キャンセル</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !orders || orders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-4 h-12 w-12" />
          <p>注文がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/shop/orders/${order.id}?from=seller`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">{order.orderNumber}</div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="mb-2 text-sm">
                    {order.items.map((item) => (
                      <div key={item.id} className="line-clamp-1">
                        {item.productName} × {item.quantity}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">買い手: {order.buyer.name}</span>
                    <span className="font-bold">&yen;{order.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
