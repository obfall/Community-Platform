import { apiClient } from "./client";
import type { PaginatedResponse, NotificationItem, NotificationQuery, UnreadCount } from "./types";

export const notificationsApi = {
  getNotifications: (params?: NotificationQuery) =>
    apiClient
      .get<PaginatedResponse<NotificationItem>>("/notifications", { params })
      .then((r) => r.data),

  getUnreadCount: () =>
    apiClient.get<UnreadCount>("/notifications/unread-count").then((r) => r.data),

  markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
};
