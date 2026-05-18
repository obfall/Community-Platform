import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { albumsApi } from "@/lib/api/albums";
import type { CreateAlbumInput, UpdateAlbumInput, AddAlbumPhotosInput } from "@/lib/api/types";

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
    mutationFn: (data: CreateAlbumInput) => albumsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success(t("created"));
    },
  });
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient();
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlbumInput }) =>
      albumsApi.update(id, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["albums", vars.id] });
      toast.success(t("updated"));
    },
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
  });
}

export function useAddAlbumPhotos() {
  const queryClient = useQueryClient();
  const t = useTranslations("albums.toast");
  return useMutation({
    mutationFn: ({ albumId, photos }: { albumId: string; photos: AddAlbumPhotosInput[] }) =>
      albumsApi.addPhotos(albumId, photos),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["albums", vars.albumId] });
      toast.success(t("photosAdded"));
    },
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
  });
}
