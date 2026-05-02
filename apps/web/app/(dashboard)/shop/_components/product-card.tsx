import Link from "next/link";
import { Package, CalendarRange } from "lucide-react";
import type { ProductListItem } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "@/components/highlighted-text";
import { SoldOverlay } from "./sold-overlay";

interface Props {
  product: ProductListItem;
  href?: string;
}

export function ProductCard({ product, href }: Props) {
  const outOfStock = product.stock !== null && product.stock <= 0;
  const linkHref = href ?? `/shop/${product.id}`;

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
    <Link href={linkHref}>
      <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
        <div className="relative h-40 bg-muted">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {outOfStock && <SoldOverlay label="SOLD" />}
        </div>
        <CardContent className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {product.category && (
              <Badge variant="secondary" className="text-xs">
                {product.category.name}
              </Badge>
            )}
            {product.series && (
              <Badge variant="outline" className="text-xs">
                {product.series.name}
              </Badge>
            )}
            {outOfStock && (
              <Badge variant="destructive" className="text-xs">
                売切
              </Badge>
            )}
          </div>
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold">
            <HighlightedText html={product.titleHighlighted} fallback={product.name} />
          </h3>
          <div className="text-lg font-bold">&yen;{product.price.toLocaleString()}</div>
          {salePeriod && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarRange className="h-3 w-3" />
              <span>{salePeriod}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
