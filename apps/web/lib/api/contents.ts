import { apiClient } from "./client";
import type { PaginatedResponse, ContentListItem } from "./types";

export const contentsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    contentType?: string;
    publishStatus?: string;
  }) =>
    apiClient.get<PaginatedResponse<ContentListItem>>("/contents", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<ContentListItem>(`/contents/${id}`).then((r) => r.data),

  getByToken: (token: string) =>
    apiClient.get<ContentListItem>(`/contents/share/${token}`).then((r) => r.data),

  create: (data: {
    name: string;
    contentType: string;
    description?: string;
    price?: number;
    coverImageUrl?: string;
    publishStatus?: string;
  }) => apiClient.post("/contents", data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/contents/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/contents/${id}`),
};
