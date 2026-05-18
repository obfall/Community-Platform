import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: (data: Parameters<typeof albumsApi.create>[0]) => albumsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success(t("created"));
    },
    onError: () => toast.error(t("createFailed"), { id: "album-create-error" }),
  });
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient();
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      albumsApi.update(id, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["albums", vars.id] });
      toast.success(t("updated"));
    },
    onError: () => toast.error(t("updateFailed"), { id: "album-update-error" }),
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: (id: string) => albumsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success(t("deleted"));
    },
    onError: () => toast.error(t("deleteFailed"), { id: "album-delete-error" }),
  });
}

export function useAddAlbumPhotos() {
  const queryClient = useQueryClient();
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: ({
      albumId,
      photos,
    }: {
      albumId: string;
      photos: Array<{ fileId: string; title?: string; caption?: string }>;
    }) => albumsApi.addPhotos(albumId, photos),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["albums", vars.albumId] });
      toast.success(t("photosAdded"));
    },
    onError: () => toast.error(t("photosAddFailed"), { id: "album-photos-add-error" }),
  });
}

export function useRemoveAlbumPhoto() {
  const queryClient = useQueryClient();
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: ({ albumId, photoId }: { albumId: string; photoId: string }) =>
      albumsApi.removePhoto(albumId, photoId),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["albums", vars.albumId] });
      toast.success(t("photoRemoved"));
    },
    onError: () => toast.error(t("photoRemoveFailed"), { id: "album-photo-remove-error" }),
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
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: (name: string) => albumsApi.createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums", "categories"] });
      toast.success(t("categoryCreated"));
    },
    onError: () => toast.error(t("categoryCreateFailed"), { id: "album-category-create-error" }),
  });
}
