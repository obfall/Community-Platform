import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pointsApi } from "@/lib/api/points";
import type { PointHistoryQuery } from "@/lib/api/types";

export function usePointSummary() {
  return useQuery({
    queryKey: ["points", "summary"],
    queryFn: () => pointsApi.getSummary(),
  });
}

export function usePointHistory(query?: PointHistoryQuery) {
  return useQuery({
    queryKey: ["points", "history", query],
    queryFn: () => pointsApi.getHistory(query),
  });
}

export function useGrantPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      userId: string;
      points: number;
      description?: string;
      expiryDays?: number;
    }) => pointsApi.grant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
      toast.success("ポイントを付与しました");
    },
    onError: () => toast.error("ポイント付与に失敗しました"),
  });
}

export function usePointRules() {
  return useQuery({
    queryKey: ["points", "rules"],
    queryFn: () => pointsApi.getRules(),
  });
}

export function useCreatePointRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      triggerEvent: string;
      pointAmount: number;
      expiryDays: number;
    }) => pointsApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points", "rules"] });
      toast.success("ルールを作成しました");
    },
    onError: () => toast.error("ルール作成に失敗しました"),
  });
}

export function useDeletePointRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pointsApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points", "rules"] });
      toast.success("ルールを削除しました");
    },
    onError: () => toast.error("ルール削除に失敗しました"),
  });
}
