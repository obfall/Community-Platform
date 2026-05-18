import { apiClient } from "./client";
import type {
  PaginatedResponse,
  AlbumListItem,
  AlbumDetail,
  AlbumCategory,
  CreateAlbumInput,
  UpdateAlbumInput,
  AddAlbumPhotosInput,
} from "./types";

export const albumsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; categoryId?: string }) =>
    apiClient.get<PaginatedResponse<AlbumListItem>>("/albums", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<AlbumDetail>(`/albums/${id}`).then((r) => r.data),

  create: (data: CreateAlbumInput) =>
    apiClient.post<AlbumDetail>("/albums", data).then((r) => r.data),

  update: (id: string, data: UpdateAlbumInput) =>
    apiClient.patch<AlbumDetail>(`/albums/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/albums/${id}`),

  addPhotos: (albumId: string, photos: AddAlbumPhotosInput[]) =>
    apiClient.post<{ count: number }>(`/albums/${albumId}/photos`, { photos }).then((r) => r.data),

  removePhoto: (albumId: string, photoId: string) =>
    apiClient.delete(`/albums/${albumId}/photos/${photoId}`),

  getCategories: () => apiClient.get<AlbumCategory[]>("/albums/categories").then((r) => r.data),

  createCategory: (name: string) =>
    apiClient.post<AlbumCategory>("/albums/categories", { name }).then((r) => r.data),
};
