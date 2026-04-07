import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { albumsApi } from "@/lib/api/albums";

export function useAlbums(query?: { page?: number; limit?: number; search?: string }) {
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
