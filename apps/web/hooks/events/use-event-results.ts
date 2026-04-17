import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { eventResultsApi } from "@/lib/api/event-results";
import type { UpsertEventResultInput } from "@/lib/api/types";

export function useEventResult(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "result"],
    queryFn: () => eventResultsApi.get(eventId!),
    enabled: !!eventId,
  });
}

export function useUpsertEventResult(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertEventResultInput) => eventResultsApi.upsert(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "result"] });
      toast.success("実施結果を保存しました");
    },
    onError: () => toast.error("実施結果の保存に失敗しました"),
  });
}

export function useDeleteEventResult(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eventResultsApi.remove(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "result"] });
      toast.success("実施結果を削除しました");
    },
    onError: () => toast.error("実施結果の削除に失敗しました"),
  });
}

export function useAddResultAttachment(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => eventResultsApi.addAttachment(eventId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "result"] });
    },
    onError: () => toast.error("添付ファイルの追加に失敗しました"),
  });
}

export function useRemoveResultAttachment(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => eventResultsApi.removeAttachment(eventId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "result"] });
      toast.success("添付ファイルを削除しました");
    },
    onError: () => toast.error("添付ファイルの削除に失敗しました"),
  });
}

export function useReorderResultAttachments(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) =>
      eventResultsApi.reorderAttachments(eventId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "result"] });
    },
    onError: () => toast.error("並び替えに失敗しました"),
  });
}
