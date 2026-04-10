import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  moderationApi,
  type CreateReportInput,
  type UpdateReportInput,
  type CreateActionInput,
  type CreateBannedWordInput,
} from "@/lib/api/moderation";

export function useReports(params?: { status?: string }) {
  return useQuery({
    queryKey: ["moderation", "reports", params],
    queryFn: () => moderationApi.getReports(params),
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ["moderation", "reports", id],
    queryFn: () => moderationApi.getReport(id!),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReportInput) => moderationApi.createReport(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "reports"] });
      toast.success("通報を送信しました");
    },
    onError: () => toast.error("通報の送信に失敗しました"),
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReportInput }) =>
      moderationApi.updateReport(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["moderation", "reports"] });
      qc.invalidateQueries({ queryKey: ["moderation", "reports", vars.id] });
      toast.success("通報を更新しました");
    },
    onError: () => toast.error("通報の更新に失敗しました"),
  });
}

export function useCreateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: CreateActionInput }) =>
      moderationApi.createAction(reportId, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["moderation", "reports", vars.reportId] });
      toast.success("アクションを記録しました");
    },
    onError: () => toast.error("アクションの記録に失敗しました"),
  });
}

export function useBannedWords() {
  return useQuery({
    queryKey: ["moderation", "banned-words"],
    queryFn: () => moderationApi.getBannedWords(),
  });
}

export function useCreateBannedWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBannedWordInput) => moderationApi.createBannedWord(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "banned-words"] });
      toast.success("禁止ワードを追加しました");
    },
    onError: () => toast.error("禁止ワードの追加に失敗しました"),
  });
}

export function useDeleteBannedWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => moderationApi.deleteBannedWord(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "banned-words"] });
      toast.success("禁止ワードを削除しました");
    },
    onError: () => toast.error("禁止ワードの削除に失敗しました"),
  });
}
