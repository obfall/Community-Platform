import { apiClient } from "./client";
import type { PaginatedResponse, ProductListItem, Order, ProductQuery } from "./types";

export const shopApi = {
  getProducts: (params?: ProductQuery) =>
    apiClient
      .get<PaginatedResponse<ProductListItem>>("/shop/products", { params })
      .then((r) => r.data),

  getProduct: (id: string) =>
    apiClient.get<ProductListItem>(`/shop/products/${id}`).then((r) => r.data),

  createProduct: (data: {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    categoryId?: string;
  }) => apiClient.post("/shop/products", data).then((r) => r.data),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/shop/products/${id}`, data).then((r) => r.data),

  deleteProduct: (id: string) => apiClient.delete(`/shop/products/${id}`),

  createOrder: (data: { items: Array<{ productId: string; quantity: number }>; notes?: string }) =>
    apiClient.post<Order>("/shop/orders", data).then((r) => r.data),

  getOrders: () => apiClient.get<Order[]>("/shop/orders").then((r) => r.data),
};
