import { apiClient } from "./client";
import type {
  PaginatedResponse,
  ContentListItem,
  ContentDetail,
  CreateContentInput,
  UpdateContentInput,
} from "./types";

export const contentsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    contentType?: string;
    publishStatus?: string;
  }) =>
    apiClient.get<PaginatedResponse<ContentListItem>>("/contents", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<ContentDetail>(`/contents/${id}`).then((r) => r.data),

  create: (data: CreateContentInput) =>
    apiClient.post<ContentDetail>("/contents", data).then((r) => r.data),

  update: (id: string, data: UpdateContentInput) =>
    apiClient.patch<ContentDetail>(`/contents/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/contents/${id}`),
};
