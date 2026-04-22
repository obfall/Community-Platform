import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => analyticsApi.getDashboard(),
    staleTime: 60 * 1000,
  });
}

export function useEngagementRanking(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["analytics", "engagement", params],
    queryFn: () => analyticsApi.getEngagement(params),
    staleTime: 60 * 1000,
  });
}

export function useParticipationDistribution() {
  return useQuery({
    queryKey: ["analytics", "events", "distribution"],
    queryFn: () => analyticsApi.getEventDistribution(),
    staleTime: 60 * 1000,
  });
}

export function useMonthlyParticipationTrend(params?: { months?: number }) {
  return useQuery({
    queryKey: ["analytics", "events", "monthly-trend", params],
    queryFn: () => analyticsApi.getMonthlyTrend(params),
    staleTime: 60 * 1000,
  });
}

export function useEventRanking(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["analytics", "events", "ranking", params],
    queryFn: () => analyticsApi.getEventRanking(params),
    staleTime: 60 * 1000,
  });
}

export function useDropoutRisk(params?: { page?: number; limit?: number; months?: number }) {
  return useQuery({
    queryKey: ["analytics", "events", "dropout-risk", params],
    queryFn: () => analyticsApi.getDropoutRisk(params),
    staleTime: 60 * 1000,
  });
}
