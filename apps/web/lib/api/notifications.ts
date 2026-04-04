import { apiClient } from "./client";
import type {
  PaginatedResponse,
  NotificationItem,
  NotificationQuery,
  UnreadCount,
  NotificationPreference,
  UpdatePreferencesInput,
} from "./types";

export const notificationsApi = {
  getNotifications: (params?: NotificationQuery) =>
    apiClient
      .get<PaginatedResponse<NotificationItem>>("/notifications", { params })
      .then((r) => r.data),

  getUnreadCount: () =>
    apiClient.get<UnreadCount>("/notifications/unread-count").then((r) => r.data),

  markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () => apiClient.patch("/notifications/read-all").then((r) => r.data),

  getPreferences: () =>
    apiClient.get<NotificationPreference[]>("/notifications/preferences").then((r) => r.data),

  updatePreferences: (data: UpdatePreferencesInput) =>
    apiClient.put("/notifications/preferences", data).then((r) => r.data),
};
