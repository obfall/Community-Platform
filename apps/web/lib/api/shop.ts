import { apiClient } from "./client";
import type {
  PaginatedResponse,
  ProductListItem,
  Order,
  ProductQuery,
  ShopCapabilities,
  SellerSummary,
} from "./types";

export const shopApi = {
  getProducts: (params?: ProductQuery) =>
    apiClient
      .get<PaginatedResponse<ProductListItem>>("/shop/products", { params })
      .then((r) => r.data),

  getProduct: (id: string) =>
    apiClient.get<ProductListItem>(`/shop/products/${id}`).then((r) => r.data),

  getCapabilities: () => apiClient.get<ShopCapabilities>("/shop/capabilities").then((r) => r.data),

  createProduct: (data: {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    categoryId?: string;
    seriesId?: string;
    saleStartAt?: string;
    saleEndAt?: string;
    publishStatus?: string;
    imageFileIds?: string[];
  }) => apiClient.post<{ id: string }>("/shop/products", data).then((r) => r.data),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/shop/products/${id}`, data).then((r) => r.data),

  deleteProduct: (id: string) => apiClient.delete(`/shop/products/${id}`),

  createOrder: (data: { items: Array<{ productId: string; quantity: number }>; notes?: string }) =>
    apiClient.post<Order>("/shop/orders", data).then((r) => r.data),

  getOrders: () => apiClient.get<Order[]>("/shop/orders").then((r) => r.data),

  getOrder: (id: string) => apiClient.get<Order>(`/shop/orders/${id}`).then((r) => r.data),

  updateOrderStatus: (id: string, status: string) =>
    apiClient.patch<Order>(`/shop/orders/${id}/status`, { status }).then((r) => r.data),

  getSellerProducts: (params?: ProductQuery) =>
    apiClient
      .get<PaginatedResponse<ProductListItem>>("/shop/seller/products", { params })
      .then((r) => r.data),

  getSellerOrders: (status?: string) =>
    apiClient
      .get<Order[]>("/shop/seller/orders", { params: status ? { status } : undefined })
      .then((r) => r.data),

  getSellerSummary: (params?: { from?: string; to?: string }) =>
    apiClient.get<SellerSummary>("/shop/seller/summary", { params }).then((r) => r.data),

  // カテゴリ・シリーズ
  getCategories: () =>
    apiClient.get<Array<{ id: string; name: string }>>("/shop/categories").then((r) => r.data),

  createCategory: (name: string) =>
    apiClient.post("/shop/categories", { name }).then((r) => r.data),

  getSeries: () =>
    apiClient.get<Array<{ id: string; name: string }>>("/shop/series").then((r) => r.data),

  createSeries: (name: string) => apiClient.post("/shop/series", { name }).then((r) => r.data),
};
