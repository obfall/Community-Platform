import { apiClient } from "./client";
import type { PaginatedResponse, AlbumListItem } from "./types";

export const albumsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; categoryId?: string }) =>
    apiClient.get<PaginatedResponse<AlbumListItem>>("/albums", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get(`/albums/${id}`).then((r) => r.data),

  create: (data: {
    title: string;
    description?: string;
    categoryId?: string;
    publishStatus?: string;
  }) => apiClient.post("/albums", data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/albums/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/albums/${id}`),

  addPhotos: (
    albumId: string,
    photos: Array<{ fileId: string; title?: string; caption?: string }>,
  ) => apiClient.post(`/albums/${albumId}/photos`, { photos }).then((r) => r.data),

  removePhoto: (albumId: string, photoId: string) =>
    apiClient.delete(`/albums/${albumId}/photos/${photoId}`),

  getCategories: () =>
    apiClient.get<Array<{ id: string; name: string }>>("/albums/categories").then((r) => r.data),

  createCategory: (name: string) =>
    apiClient.post("/albums/categories", { name }).then((r) => r.data),
};
