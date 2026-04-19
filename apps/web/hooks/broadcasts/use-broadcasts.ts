import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { broadcastsApi } from "@/lib/api/broadcasts";
import type {
  CreateBroadcastInput,
  CreateBroadcastTemplateInput,
  UpdateBroadcastTemplateInput,
  CreateBroadcastSuppressionInput,
  BroadcastQuery,
} from "@/lib/api/types";

export function useBroadcasts(query?: BroadcastQuery) {
  return useQuery({
    queryKey: ["broadcasts", query],
    queryFn: () => broadcastsApi.list(query),
    staleTime: 30 * 1000,
  });
}

export function useBroadcast(id: string | undefined) {
  return useQuery({
    queryKey: ["broadcasts", id],
    queryFn: () => broadcastsApi.get(id!),
    enabled: !!id,
  });
}

export function useBroadcastTemplates() {
  return useQuery({
    queryKey: ["broadcasts", "templates"],
    queryFn: () => broadcastsApi.getTemplates(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBroadcastSuppressions() {
  return useQuery({
    queryKey: ["broadcasts", "suppressions"],
    queryFn: () => broadcastsApi.getSuppressions(),
    staleTime: 60 * 1000,
  });
}

export function useCreateAndSendBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBroadcastInput) => {
      const broadcast = await broadcastsApi.create(data);
      return broadcastsApi.send(broadcast.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("配信を送信しました");
    },
    onError: () => toast.error("配信の送信に失敗しました"),
  });
}

export function useSendBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => broadcastsApi.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("配信を送信しました");
    },
    onError: () => toast.error("配信の送信に失敗しました"),
  });
}

export function useCreateBroadcastTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBroadcastTemplateInput) => broadcastsApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", "templates"] });
      toast.success("テンプレートを作成しました");
    },
    onError: () => toast.error("テンプレートの作成に失敗しました"),
  });
}

export function useUpdateBroadcastTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBroadcastTemplateInput }) =>
      broadcastsApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", "templates"] });
      toast.success("テンプレートを更新しました");
    },
    onError: () => toast.error("テンプレートの更新に失敗しました"),
  });
}

export function useDeleteBroadcastTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => broadcastsApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", "templates"] });
      toast.success("テンプレートを削除しました");
    },
    onError: () => toast.error("テンプレートの削除に失敗しました"),
  });
}

export function useCreateBroadcastSuppression() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBroadcastSuppressionInput) => broadcastsApi.createSuppression(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", "suppressions"] });
      toast.success("配信停止に追加しました");
    },
    onError: () => toast.error("配信停止の追加に失敗しました"),
  });
}

export function useDeleteBroadcastSuppression() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => broadcastsApi.deleteSuppression(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", "suppressions"] });
      toast.success("配信停止を解除しました");
    },
    onError: () => toast.error("配信停止の解除に失敗しました"),
  });
}
