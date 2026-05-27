"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useProducts,
  useDeleteProduct,
  useProductCategories,
  useCreateProductCategory,
  useProductSeries,
  useCreateProductSeries,
  useShopCapabilities,
  useSellerOrders,
  useSellerSummary,
} from "@/hooks/shop/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, ShoppingBag, MoreHorizontal, Receipt } from "lucide-react";
import type { ProductQuery, ProductListItem } from "@/lib/api/types";
import { SelectField } from "@/components/select-field";
import { PUBLISH_STATUS_LABELS, PUBLISH_STATUS_OPTIONS } from "@/lib/constants/publish-status";
import { OrderStatusBadge } from "../_components/order-status-badge";

export default function ShopManagePage() {
  const t = useTranslations("shop.manage");
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "products";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="products">{t("tabProducts")}</TabsTrigger>
          <TabsTrigger value="orders">{t("tabOrders")}</TabsTrigger>
          <TabsTrigger value="summary">{t("tabSummary")}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="summary" className="mt-6">
          <SummaryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab() {
  const t = useTranslations("shop.manage");
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
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          {t("addCategory")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSeriesDialogOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          {t("addSeries")}
        </Button>
        {capabilities?.canCreateProduct && (
          <Link href="/shop/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("newProduct")}
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((p) => ({ ...p, search: v || undefined, page: 1 }))}
          placeholder={t("searchPlaceholder")}
          className="max-w-xs"
        />
        <SelectField
          value={query.publishStatus ?? "all"}
          onChange={(v) => setQuery((p) => ({ ...p, publishStatus: v, page: 1 }))}
          options={PUBLISH_STATUS_OPTIONS}
          includeAll
          placeholder={t("statusPlaceholder")}
          className="w-36"
        />
        <Select
          value={query.categoryId ?? "all"}
          onValueChange={(v) =>
            setQuery((p) => ({ ...p, categoryId: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("categoryAll")}</SelectItem>
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
            <SelectValue placeholder={t("seriesPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("seriesAll")}</SelectItem>
            {seriesList?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12" />
          <p>{t("emptyProducts")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colCategory")}</TableHead>
              <TableHead>{t("colSeries")}</TableHead>
              <TableHead>{t("colPrice")}</TableHead>
              <TableHead>{t("colStock")}</TableHead>
              <TableHead>{t("colPublish")}</TableHead>
              <TableHead>{t("colSales")}</TableHead>
              <TableHead>{t("colCreated")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
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
                <TableCell>{p.stock != null ? p.stock : t("stockUnlimited")}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {PUBLISH_STATUS_LABELS[p.publishStatus] ?? p.publishStatus}
                  </Badge>
                </TableCell>
                <TableCell>{p.salesCount}</TableCell>
                <TableCell>{new Date(p.createdAt).toLocaleDateString("ja-JP")}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/shop/${p.id}/edit`)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
            <DialogTitle>{t("catDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("catNameLabel")}</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t("catNamePlaceholder")}
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
              {t("create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("seriesDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("seriesNameLabel")}</Label>
              <Input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder={t("seriesNamePlaceholder")}
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
              {t("create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteCancel")}</AlertDialogCancel>
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
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrdersTab() {
  const t = useTranslations("shop.manage");
  const tStatus = useTranslations("shop.orderStatus");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: orders, isLoading } = useSellerOrders(
    statusFilter === "all" ? undefined : statusFilter,
  );

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">{t("orderTabAll")}</TabsTrigger>
          <TabsTrigger value="in_progress">{tStatus("in_progress")}</TabsTrigger>
          <TabsTrigger value="in_negotiation">{tStatus("in_negotiation")}</TabsTrigger>
          <TabsTrigger value="completed">{tStatus("completed")}</TabsTrigger>
          <TabsTrigger value="canceled">{tStatus("canceled")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : !orders || orders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-4 h-12 w-12" />
          <p>{t("emptyOrders")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/shop/orders/${order.id}?from=manage`}>
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
                    <span className="text-muted-foreground">
                      {t("orderBuyer", { name: order.buyer.name })}
                    </span>
                    <span className="font-bold">¥{order.totalAmount.toLocaleString()}</span>
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

function SummaryTab() {
  const t = useTranslations("shop.manage");
  const tStatus = useTranslations("shop.orderStatus");
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
          <Label>{t("summaryFrom")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>{t("summaryTo")}</Label>
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
            {t("summaryClear")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t("summaryRevenue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{(summary?.totalRevenue ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("summaryOrderCount")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.orderCount ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("summaryByStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{tStatus("in_progress")}</span>
                <span className="font-semibold">{summary?.inProgressCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{tStatus("in_negotiation")}</span>
                <span className="font-semibold">{summary?.inNegotiationCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{tStatus("completed")}</span>
                <span className="font-semibold">{summary?.completedCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{tStatus("canceled")}</span>
                <span className="font-semibold">{summary?.canceledCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
