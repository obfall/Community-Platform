import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => analyticsApi.getDashboard(),
    staleTime: 60 * 1000,
  });
}

export function useMemberActivity(params?: { page?: number; limit?: number; sortBy?: string }) {
  return useQuery({
    queryKey: ["analytics", "members", params],
    queryFn: () => analyticsApi.getMemberActivity(params),
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
