import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications";
import type { NotificationQuery } from "@/lib/api/types";

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
