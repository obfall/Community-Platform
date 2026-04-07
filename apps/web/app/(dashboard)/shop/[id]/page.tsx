"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useProduct, useCreateOrder } from "@/hooks/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Package, ShoppingCart } from "lucide-react";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);
  const createOrder = useCreateOrder();
  const [quantity, setQuantity] = useState("1");

  const handleOrder = () => {
    createOrder.mutate(
      { items: [{ productId: id, quantity: Number(quantity) }] },
      { onSuccess: () => setQuantity("1") },
    );
  };

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!product)
    return <div className="py-12 text-center text-muted-foreground">商品が見つかりません</div>;

  const outOfStock = product.stock !== null && product.stock <= 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/shop">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex-1 text-2xl font-bold">{product.name}</h1>
        <Link href={`/shop/${product.id}/edit`}>
          <Button variant="outline" size="sm">
            編集
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <ProductImageCarousel
            images={
              (
                product as unknown as {
                  images?: Array<{ id: string; file: { publicUrl: string | null } }>;
                }
              ).images ?? []
            }
            productName={product.name}
          />

          <div className="mb-4 flex items-center gap-2">
            {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
            {outOfStock && <Badge variant="destructive">売切</Badge>}
            {product.stock !== null && product.stock > 0 && (
              <Badge variant="outline">在庫: {product.stock}</Badge>
            )}
          </div>

          {product.description && (
            <div className="mb-4 whitespace-pre-wrap text-sm">{product.description}</div>
          )}

          <div className="flex items-center gap-4 border-t pt-4">
            <div>
              <div className="text-2xl font-bold">&yen;{product.price.toLocaleString()}</div>
              {product.compareAtPrice && (
                <div className="text-sm text-muted-foreground line-through">
                  &yen;{product.compareAtPrice.toLocaleString()}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">販売者: {product.seller.name}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>購入</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>数量</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={product.stock ?? undefined}
              className="w-24"
            />
          </div>
          <Button
            onClick={handleOrder}
            disabled={outOfStock || createOrder.isPending}
            className="w-full"
          >
            {createOrder.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            {outOfStock ? "売り切れ" : "注文する"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductImageCarousel({
  images,
  productName,
}: {
  images: Array<{ id: string; file: { publicUrl: string | null } }>;
  productName: string;
}) {
  const validImages = images.filter((img) => img.file.publicUrl);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (validImages.length === 0) {
    return (
      <div className="mb-4 flex aspect-square items-center justify-center rounded-lg bg-muted">
        <Package className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  const go = (next: number) => {
    const len = validImages.length;
    setIndex(((next % len) + len) % len);
  };

  return (
    <div className="mb-4 space-y-3">
      <div
        className="relative aspect-square overflow-hidden rounded-lg bg-muted"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
          touchStartX.current = null;
        }}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {validImages.map((img) => (
            <div key={img.id} className="h-full w-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file.publicUrl!}
                alt={productName}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              aria-label="前の画像"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              aria-label="次の画像"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {validImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-6 bg-white" : "w-2 bg-white/50"
                  }`}
                  aria-label={`画像 ${i + 1}`}
                />
              ))}
            </div>
            <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {index + 1} / {validImages.length}
            </span>
          </>
        )}
      </div>

      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                i === index ? "border-primary" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file.publicUrl!}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
