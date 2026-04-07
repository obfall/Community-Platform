"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useProduct, useCreateOrder } from "@/hooks/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Package, ShoppingCart } from "lucide-react";

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
          <div className="mb-4 flex h-48 items-center justify-center rounded-lg bg-muted">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground" />
            )}
          </div>

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
