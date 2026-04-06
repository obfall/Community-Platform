import { apiClient } from "./client";
import type {
  PaginatedResponse,
  AnalyticsDashboard,
  MemberActivityItem,
  EngagementScoreItem,
} from "./types";

export const analyticsApi = {
  getDashboard: () => apiClient.get<AnalyticsDashboard>("/analytics/dashboard").then((r) => r.data),

  getMemberActivity: (params?: { page?: number; limit?: number; sortBy?: string }) =>
    apiClient
      .get<PaginatedResponse<MemberActivityItem>>("/analytics/members", { params })
      .then((r) => r.data),

  getEngagement: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<EngagementScoreItem>>("/analytics/engagement", { params })
      .then((r) => r.data),

  getActivity: (params?: { page?: number; limit?: number; userId?: string; action?: string }) =>
    apiClient.get("/analytics/activity", { params }).then((r) => r.data),
};
