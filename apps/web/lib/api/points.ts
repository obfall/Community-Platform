import { apiClient } from "./client";
import type {
  PaginatedResponse,
  PointSummary,
  PointHistory,
  PointRule,
  PointHistoryQuery,
} from "./types";

export const pointsApi = {
  getSummary: () => apiClient.get<PointSummary>("/points/summary").then((r) => r.data),

  getHistory: (params?: PointHistoryQuery) =>
    apiClient
      .get<PaginatedResponse<PointHistory>>("/points/history", { params })
      .then((r) => r.data),

  grant: (data: { userId: string; points: number; description?: string; expiryDays?: number }) =>
    apiClient.post("/points/grant", data).then((r) => r.data),

  getRules: () => apiClient.get<PointRule[]>("/points/rules").then((r) => r.data),

  createRule: (data: {
    name: string;
    triggerEvent: string;
    pointAmount: number;
    expiryDays: number;
  }) => apiClient.post<PointRule>("/points/rules", data).then((r) => r.data),

  updateRule: (
    id: string,
    data: { name?: string; pointAmount?: number; expiryDays?: number; isActive?: boolean },
  ) => apiClient.patch<PointRule>(`/points/rules/${id}`, data).then((r) => r.data),

  deleteRule: (id: string) => apiClient.delete(`/points/rules/${id}`),
};
