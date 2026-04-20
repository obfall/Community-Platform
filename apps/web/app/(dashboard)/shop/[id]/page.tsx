"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProduct, useCreateOrder } from "@/hooks/shop/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, ShoppingCart, CalendarRange } from "lucide-react";
import { ProductImageCarousel } from "./_components/product-image-carousel";
import { SoldOverlay } from "../_components/sold-overlay";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromManage = searchParams.get("from") === "manage";
  const { data: product, isLoading } = useProduct(id);
  const createOrder = useCreateOrder();
  const [quantity, setQuantity] = useState("1");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmOrder = () => {
    createOrder.mutate(
      { items: [{ productId: id, quantity: Number(quantity) }] },
      {
        onSuccess: (order) => {
          setQuantity("1");
          setConfirmOpen(false);
          router.push(`/shop/orders/${order.id}`);
        },
      },
    );
  };

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!product)
    return <div className="py-12 text-center text-muted-foreground">商品が見つかりません</div>;

  const outOfStock = product.stock !== null && product.stock <= 0;
  const now = new Date();
  const saleStart = product.saleStartAt ? new Date(product.saleStartAt) : null;
  const saleEnd = product.saleEndAt ? new Date(product.saleEndAt) : null;
  const beforeSale = saleStart !== null && saleStart > now;
  const afterSale = saleEnd !== null && saleEnd < now;
  const cannotOrder = outOfStock || beforeSale || afterSale;
  const orderButtonLabel = outOfStock
    ? "売り切れ"
    : beforeSale
      ? "販売開始前"
      : afterSale
        ? "販売終了"
        : "購入を申し込む";
  const images =
    (product as unknown as { images?: Array<{ id: string; file: { publicUrl: string | null } }> })
      .images ?? [];

  const formatSalePeriod = () => {
    const fmt = (v: string) => new Date(v).toLocaleDateString("ja-JP");
    if (product.saleStartAt && product.saleEndAt)
      return `${fmt(product.saleStartAt)} 〜 ${fmt(product.saleEndAt)}`;
    if (product.saleStartAt) return `${fmt(product.saleStartAt)} 〜`;
    if (product.saleEndAt) return `〜 ${fmt(product.saleEndAt)}`;
    return null;
  };
  const salePeriod = formatSalePeriod();

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-5 pb-24">
        <div className="flex items-center gap-2">
          <Link href={fromManage ? "/shop/manage" : "/shop"}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          {fromManage && (
            <Link href={`/shop/${product.id}/edit`} className="ml-auto">
              <Button variant="outline" size="sm">
                編集
              </Button>
            </Link>
          )}
        </div>

        <div className="relative overflow-hidden rounded-md bg-muted">
          <ProductImageCarousel images={images} productName={product.name} />
          {outOfStock && <SoldOverlay />}
        </div>

        <div className="space-y-3">
          <h1 className="text-lg font-bold">{product.name}</h1>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">&yen;{product.price.toLocaleString()}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                &yen;{product.compareAtPrice.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
            {product.series && <Badge variant="outline">{product.series.name}</Badge>}
            {outOfStock && <Badge variant="destructive">売切</Badge>}
            {beforeSale && <Badge variant="outline">販売開始前</Badge>}
            {afterSale && <Badge variant="outline">販売終了</Badge>}
          </div>
          {salePeriod && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              <span>販売期間: {salePeriod}</span>
            </div>
          )}
        </div>

        {product.description && (
          <div className="space-y-2 border-t pt-4">
            <h2 className="text-sm font-semibold">商品説明</h2>
            <div className="whitespace-pre-wrap text-sm">{product.description}</div>
          </div>
        )}

        <div className="border-t pt-4 text-sm text-muted-foreground">
          販売者: {product.seller.name}
        </div>
      </div>

      {!fromManage && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-1">
              <Label htmlFor="quantity" className="text-xs">
                数量
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                max={product.stock ?? undefined}
                className="w-16"
              />
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={cannotOrder || createOrder.isPending}
              className="flex-1"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {orderButtonLabel}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>購入を申し込みますか？</DialogTitle>
            <DialogDescription>
              申込後、販売者から支払い・受け渡しの連絡が来るまでお待ちください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">商品</span>
              <span className="font-medium">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">数量</span>
              <span>{Number(quantity) || 0}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">合計</span>
              <span className="text-lg font-bold">
                &yen;{(product.price * (Number(quantity) || 0)).toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={createOrder.isPending}
            >
              キャンセル
            </Button>
            <Button onClick={handleConfirmOrder} disabled={createOrder.isPending}>
              {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              申し込む
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
