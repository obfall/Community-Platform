import { apiClient } from "./client";
import type {
  PaginatedResponse,
  AnalyticsDashboard,
  EngagementScoreItem,
  ParticipationDistribution,
  MonthlyParticipationTrend,
  EventRankingItem,
  DropoutRiskItem,
} from "./types";

export const analyticsApi = {
  getDashboard: () => apiClient.get<AnalyticsDashboard>("/analytics/dashboard").then((r) => r.data),

  getEngagement: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<EngagementScoreItem>>("/analytics/engagement", { params })
      .then((r) => r.data),

  getActivity: (params?: { page?: number; limit?: number; userId?: string; action?: string }) =>
    apiClient.get("/analytics/activity", { params }).then((r) => r.data),

  getEventDistribution: () =>
    apiClient.get<ParticipationDistribution>("/analytics/events/distribution").then((r) => r.data),

  getMonthlyTrend: (params?: { months?: number }) =>
    apiClient
      .get<MonthlyParticipationTrend>("/analytics/events/monthly-trend", { params })
      .then((r) => r.data),

  getEventRanking: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<EventRankingItem>>("/analytics/events/ranking", { params })
      .then((r) => r.data),

  getDropoutRisk: (params?: { page?: number; limit?: number; months?: number }) =>
    apiClient
      .get<PaginatedResponse<DropoutRiskItem>>("/analytics/events/dropout-risk", { params })
      .then((r) => r.data),
};
