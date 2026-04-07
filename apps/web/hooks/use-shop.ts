import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shopApi } from "@/lib/api/shop";
import type { ProductQuery } from "@/lib/api/types";

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
  return useMutation({
    mutationFn: shopApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("商品を登録しました");
    },
    onError: () => toast.error("商品登録に失敗しました"),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("商品を削除しました");
    },
    onError: () => toast.error("商品削除に失敗しました"),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      shopApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("商品を更新しました");
    },
    onError: () => toast.error("商品更新に失敗しました"),
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
  return useMutation({
    mutationFn: (name: string) => shopApi.createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "categories"] });
      toast.success("カテゴリを作成しました");
    },
    onError: () => toast.error("カテゴリ作成に失敗しました"),
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
  return useMutation({
    mutationFn: (name: string) => shopApi.createSeries(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "series"] });
      toast.success("シリーズを作成しました");
    },
    onError: () => toast.error("シリーズ作成に失敗しました"),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => shopApi.getOrders(),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: shopApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("注文が完了しました");
    },
    onError: () => toast.error("注文に失敗しました"),
  });
}
