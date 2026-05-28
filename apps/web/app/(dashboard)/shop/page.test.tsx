import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import type { ProductListItem } from "@/lib/api/types";

const useProducts = vi.fn();
const useProductCategories = vi.fn();
const useProductSeries = vi.fn();

vi.mock("@/hooks/shop/use-shop", () => ({
  useProducts: () => useProducts(),
  useProductCategories: () => useProductCategories(),
  useProductSeries: () => useProductSeries(),
}));

import ShopPage from "./page";

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

describe("ShopPage", () => {
  beforeEach(() => {
    useProductCategories.mockReturnValue({ data: undefined });
    useProductSeries.mockReturnValue({ data: undefined });
  });

  it("i18n の見出し「ショップ」を表示する", () => {
    useProducts.mockReturnValue({ data: { data: [], meta: undefined }, isLoading: false });
    renderWithProviders(<ShopPage />);
    expect(screen.getByRole("heading", { name: "ショップ" })).toBeInTheDocument();
  });

  it("読み込み中はローディング文言を表示する", () => {
    useProducts.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<ShopPage />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("商品が 0 件のとき空表示文言を出す", () => {
    useProducts.mockReturnValue({ data: { data: [], meta: undefined }, isLoading: false });
    renderWithProviders(<ShopPage />);
    expect(screen.getByText("商品がありません")).toBeInTheDocument();
  });

  it("商品があれば商品名を表示する", () => {
    useProducts.mockReturnValue({
      data: { data: [buildProduct({ name: "コーヒー豆" })], meta: undefined },
      isLoading: false,
    });
    renderWithProviders(<ShopPage />);
    expect(screen.getByText("コーヒー豆")).toBeInTheDocument();
    expect(screen.queryByText("商品がありません")).not.toBeInTheDocument();
  });
});
