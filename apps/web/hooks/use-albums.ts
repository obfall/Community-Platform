import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { albumsApi } from "@/lib/api/albums";

export function useAlbums(query?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}) {
  return useQuery({
    queryKey: ["albums", query],
    queryFn: () => albumsApi.getAll(query),
  });
}

export function useAlbum(id: string | undefined) {
  return useQuery({
    queryKey: ["albums", id],
    queryFn: () => albumsApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: albumsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("アルバムを作成しました");
    },
    onError: () => toast.error("アルバム作成に失敗しました"),
  });
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      albumsApi.update(id, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["albums", vars.id] });
      toast.success("アルバムを更新しました");
    },
    onError: () => toast.error("アルバム更新に失敗しました"),
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => albumsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("アルバムを削除しました");
    },
    onError: () => toast.error("アルバム削除に失敗しました"),
  });
}

export function useAlbumCategories() {
  return useQuery({
    queryKey: ["albums", "categories"],
    queryFn: () => albumsApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAlbumCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => albumsApi.createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums", "categories"] });
      toast.success("カテゴリを作成しました");
    },
    onError: () => toast.error("カテゴリ作成に失敗しました"),
  });
}
