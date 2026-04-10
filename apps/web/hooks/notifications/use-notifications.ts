import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api/notifications";
import type { NotificationQuery, UpdatePreferencesInput } from "@/lib/api/types";

// --- Queries ---

export function useNotifications(query?: NotificationQuery) {
  return useQuery({
    queryKey: ["notifications", query],
    queryFn: () => notificationsApi.getNotifications(query),
    staleTime: 30 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: () => notificationsApi.getPreferences(),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Mutations ---

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("すべての通知を既読にしました");
    },
    onError: () => toast.error("操作に失敗しました"),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePreferencesInput) => notificationsApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
      toast.success("通知設定を更新しました");
    },
    onError: () => toast.error("通知設定の更新に失敗しました"),
  });
}
