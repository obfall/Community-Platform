import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { shopApi } from "@/lib/api/shop";
import type { ProductQuery } from "@/lib/api/types";

// エラートーストはグローバルの MutationCache.onError 任せ（Phase 11.3 規約）。
// 個別フックでは成功時の toast.success のみ扱う。

export function useShopCapabilities() {
  return useQuery({
    queryKey: ["shop", "capabilities"],
    queryFn: () => shopApi.getCapabilities(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProducts(query?: ProductQuery) {
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => shopApi.getProducts(query),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => shopApi.getProduct(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const t = useTranslations("shop.toast");
  return useMutation({
    mutationFn: shopApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("productCreated"));
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const t = useTranslations("shop.toast");
  return useMutation({
    mutationFn: (id: string) => shopApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("productDeleted"));
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const t = useTranslations("shop.toast");
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      shopApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("productUpdated"));
    },
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ["products", "categories"],
    queryFn: () => shopApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations("shop.toast");
  return useMutation({
    mutationFn: (name: string) => shopApi.createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "categories"] });
      toast.success(t("categoryCreated"));
    },
  });
}

export function useProductSeries() {
  return useQuery({
    queryKey: ["products", "series"],
    queryFn: () => shopApi.getSeries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProductSeries() {
  const queryClient = useQueryClient();
  const t = useTranslations("shop.toast");
  return useMutation({
    mutationFn: (name: string) => shopApi.createSeries(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "series"] });
      toast.success(t("seriesCreated"));
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => shopApi.getOrders(),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => shopApi.getOrder(id!),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const t = useTranslations("shop.toast");
  return useMutation({
    mutationFn: shopApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("orderCreated"));
    },
  });
}

export function useSellerProducts(query?: ProductQuery) {
  return useQuery({
    queryKey: ["shop", "seller", "products", query],
    queryFn: () => shopApi.getSellerProducts(query),
  });
}

export function useSellerOrders(status?: string) {
  return useQuery({
    queryKey: ["shop", "seller", "orders", status ?? "all"],
    queryFn: () => shopApi.getSellerOrders(status),
  });
}

export function useSellerSummary(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["shop", "seller", "summary", params?.from ?? "", params?.to ?? ""],
    queryFn: () => shopApi.getSellerSummary(params),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const t = useTranslations("shop.toast");
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      shopApi.updateOrderStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
      toast.success(t("statusUpdated"));
    },
  });
}
