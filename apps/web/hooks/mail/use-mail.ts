import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mailApi } from "@/lib/api/mail";
import type {
  CreateMailMessageInput,
  UpdateMailMessageInput,
  CreateMailTemplateInput,
  UpdateMailTemplateInput,
  CreateMailSuppressionInput,
  MailMessageQuery,
} from "@/lib/api/types";

// --- Queries ---

export function useMailMessages(query?: MailMessageQuery) {
  return useQuery({
    queryKey: ["mail", "messages", query],
    queryFn: () => mailApi.getMessages(query),
    staleTime: 30 * 1000,
  });
}

export function useMailMessage(id: string | undefined) {
  return useQuery({
    queryKey: ["mail", "messages", id],
    queryFn: () => mailApi.getMessage(id!),
    enabled: !!id,
  });
}

export function useMailTemplates() {
  return useQuery({
    queryKey: ["mail", "templates"],
    queryFn: () => mailApi.getTemplates(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMailSuppressions() {
  return useQuery({
    queryKey: ["mail", "suppressions"],
    queryFn: () => mailApi.getSuppressions(),
    staleTime: 60 * 1000,
  });
}

// --- Mutations ---

export function useCreateMailMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMailMessageInput) => mailApi.createMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "messages"] });
      toast.success("メッセージを作成しました");
    },
    onError: () => toast.error("メッセージの作成に失敗しました"),
  });
}

export function useUpdateMailMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMailMessageInput }) =>
      mailApi.updateMessage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "messages"] });
      toast.success("メッセージを更新しました");
    },
    onError: () => toast.error("メッセージの更新に失敗しました"),
  });
}

export function useSendMailMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mailApi.sendMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "messages"] });
      toast.success("メールを送信しました");
    },
    onError: () => toast.error("メールの送信に失敗しました"),
  });
}

export function useCreateMailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMailTemplateInput) => mailApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "templates"] });
      toast.success("テンプレートを作成しました");
    },
    onError: () => toast.error("テンプレートの作成に失敗しました"),
  });
}

export function useUpdateMailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMailTemplateInput }) =>
      mailApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "templates"] });
      toast.success("テンプレートを更新しました");
    },
    onError: () => toast.error("テンプレートの更新に失敗しました"),
  });
}

export function useDeleteMailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mailApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "templates"] });
      toast.success("テンプレートを削除しました");
    },
    onError: () => toast.error("テンプレートの削除に失敗しました"),
  });
}

export function useCreateMailSuppression() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMailSuppressionInput) => mailApi.createSuppression(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "suppressions"] });
      toast.success("配信停止に追加しました");
    },
    onError: () => toast.error("配信停止の追加に失敗しました"),
  });
}

export function useDeleteMailSuppression() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mailApi.deleteSuppression(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "suppressions"] });
      toast.success("配信停止を解除しました");
    },
    onError: () => toast.error("配信停止の解除に失敗しました"),
  });
}
