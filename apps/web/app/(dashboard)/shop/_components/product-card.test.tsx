import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import type { ProductListItem } from "@/lib/api/types";
import { ProductCard } from "./product-card";

function buildProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: "p1",
    name: "テスト商品",
    description: null,
    price: 1000,
    compareAtPrice: null,
    stock: 5,
    publishStatus: "published",
    status: "active",
    salesCount: 0,
    imageUrl: null,
    category: null,
    series: null,
    seller: { id: "u1", name: "出品者" },
    saleStartAt: null,
    saleEndAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ProductCard", () => {
  it("商品名と価格（¥区切り）を表示する", () => {
    renderWithProviders(<ProductCard product={buildProduct({ price: 12345 })} />);
    expect(screen.getByText("テスト商品")).toBeInTheDocument();
    expect(screen.getByText("¥12,345")).toBeInTheDocument();
  });

  it("在庫が 0 以下のとき i18n の「売切」バッジを表示する", () => {
    renderWithProviders(<ProductCard product={buildProduct({ stock: 0 })} />);
    expect(screen.getByText("売切")).toBeInTheDocument();
  });

  it("在庫があるとき「売切」バッジを表示しない", () => {
    renderWithProviders(<ProductCard product={buildProduct({ stock: 3 })} />);
    expect(screen.queryByText("売切")).not.toBeInTheDocument();
  });

  it("stock が null（無制限）のときは在庫切れ扱いにしない", () => {
    renderWithProviders(<ProductCard product={buildProduct({ stock: null })} />);
    expect(screen.queryByText("売切")).not.toBeInTheDocument();
  });

  it("カテゴリ・シリーズがあればバッジとして表示する", () => {
    renderWithProviders(
      <ProductCard
        product={buildProduct({
          category: { id: "c1", name: "雑貨" },
          series: { id: "s1", name: "限定シリーズ" },
        })}
      />,
    );
    expect(screen.getByText("雑貨")).toBeInTheDocument();
    expect(screen.getByText("限定シリーズ")).toBeInTheDocument();
  });
});
