import { apiClient } from "./client";
import type { Announcement } from "./types";

export interface AnnouncementInput {
  title: string;
  body: string;
  targetAudience?: string;
  isPublished?: boolean;
  publishedAt?: string;
  pinnedUntil?: string;
}

export const announcementsApi = {
  getAll: (params?: { targetAudience?: string }) =>
    apiClient.get<Announcement[]>("/announcements", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<Announcement>(`/announcements/${id}`).then((r) => r.data),

  create: (data: AnnouncementInput) =>
    apiClient.post<Announcement>("/announcements", data).then((r) => r.data),

  update: (id: string, data: Partial<AnnouncementInput>) =>
    apiClient.patch<Announcement>(`/announcements/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/announcements/${id}`),
};
