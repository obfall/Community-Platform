import { apiClient } from "./client";
import type {
  PaginatedResponse,
  Broadcast,
  BroadcastDetail,
  BroadcastTemplate,
  BroadcastSuppression,
  CreateBroadcastInput,
  UpdateBroadcastInput,
  CreateBroadcastTemplateInput,
  UpdateBroadcastTemplateInput,
  CreateBroadcastSuppressionInput,
  BroadcastQuery,
} from "./types";

export const broadcastsApi = {
  list: (params?: BroadcastQuery) =>
    apiClient.get<PaginatedResponse<Broadcast>>("/broadcasts", { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<BroadcastDetail>(`/broadcasts/${id}`).then((r) => r.data),

  create: (data: CreateBroadcastInput) =>
    apiClient.post<Broadcast>("/broadcasts", data).then((r) => r.data),

  update: (id: string, data: UpdateBroadcastInput) =>
    apiClient.patch<Broadcast>(`/broadcasts/${id}`, data).then((r) => r.data),

  send: (id: string) => apiClient.post<Broadcast>(`/broadcasts/${id}/send`).then((r) => r.data),

  // Templates
  getTemplates: () =>
    apiClient.get<BroadcastTemplate[]>("/broadcasts/templates").then((r) => r.data),

  createTemplate: (data: CreateBroadcastTemplateInput) =>
    apiClient.post<BroadcastTemplate>("/broadcasts/templates", data).then((r) => r.data),

  updateTemplate: (id: string, data: UpdateBroadcastTemplateInput) =>
    apiClient.patch<BroadcastTemplate>(`/broadcasts/templates/${id}`, data).then((r) => r.data),

  deleteTemplate: (id: string) => apiClient.delete(`/broadcasts/templates/${id}`),

  // Suppressions
  getSuppressions: () =>
    apiClient.get<BroadcastSuppression[]>("/broadcasts/suppressions").then((r) => r.data),

  createSuppression: (data: CreateBroadcastSuppressionInput) =>
    apiClient.post<BroadcastSuppression>("/broadcasts/suppressions", data).then((r) => r.data),

  deleteSuppression: (id: string) => apiClient.delete(`/broadcasts/suppressions/${id}`),
};
