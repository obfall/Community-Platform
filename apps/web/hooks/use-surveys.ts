import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { surveysApi } from "@/lib/api/surveys";
import type { SurveyQuery } from "@/lib/api/types";

export function useSurveys(query?: SurveyQuery) {
  return useQuery({
    queryKey: ["surveys", query],
    queryFn: () => surveysApi.getAll(query),
  });
}

export function useSurvey(id: string | undefined) {
  return useQuery({
    queryKey: ["surveys", id],
    queryFn: () => surveysApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: surveysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("アンケートを作成しました");
    },
    onError: () => toast.error("アンケート作成に失敗しました"),
  });
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      surveysApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["surveys", variables.id] });
      toast.success("アンケートを更新しました");
    },
    onError: () => toast.error("アンケート更新に失敗しました"),
  });
}

export function useUpdateSurveyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      surveysApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("ステータスを更新しました");
    },
    onError: () => toast.error("ステータス更新に失敗しました"),
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => surveysApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("アンケートを削除しました");
    },
    onError: () => toast.error("アンケート削除に失敗しました"),
  });
}

export function useSubmitSurveyResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      surveyId,
      answers,
    }: {
      surveyId: string;
      answers: Array<{
        questionId: string;
        selectedOptions?: string[];
        textValue?: string;
        numericValue?: number;
      }>;
    }) => surveysApi.submitResponse(surveyId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("回答を送信しました");
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "回答の送信に失敗しました";
      toast.error(msg);
    },
  });
}

export function useSurveyResults(id: string | undefined) {
  return useQuery({
    queryKey: ["surveys", id, "results"],
    queryFn: () => surveysApi.getResults(id!),
    enabled: !!id,
  });
}
