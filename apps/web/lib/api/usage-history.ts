import { apiClient } from "./client";
import type {
  ActivityLogItem,
  ActivityLogQuery,
  LoginHistoryItem,
  LoginHistoryQuery,
  PaginatedResponse,
} from "./types";

export const usageHistoryApi = {
  listActivityLogs: (params?: ActivityLogQuery) =>
    apiClient
      .get<PaginatedResponse<ActivityLogItem>>("/usage-history/activity", { params })
      .then((r) => r.data),

  listLoginHistories: (params?: LoginHistoryQuery) =>
    apiClient
      .get<PaginatedResponse<LoginHistoryItem>>("/usage-history/logins", { params })
      .then((r) => r.data),

  exportActivityLogs: (params?: ActivityLogQuery) =>
    apiClient
      .get("/usage-history/activity/export", { params, responseType: "blob" })
      .then((r) => r.data),

  exportLoginHistories: (params?: LoginHistoryQuery) =>
    apiClient
      .get("/usage-history/logins/export", { params, responseType: "blob" })
      .then((r) => r.data),
};
