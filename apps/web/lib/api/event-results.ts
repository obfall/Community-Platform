import { apiClient } from "./client";
import type { EventResult, EventResultAttachment, UpsertEventResultInput } from "./types";

export const eventResultsApi = {
  get: (eventId: string) =>
    apiClient.get<EventResult | null>(`/events/${eventId}/result`).then((r) => r.data),

  upsert: (eventId: string, data: UpsertEventResultInput) =>
    apiClient.put<EventResult>(`/events/${eventId}/result`, data).then((r) => r.data),

  remove: (eventId: string) => apiClient.delete(`/events/${eventId}/result`),

  addAttachment: (eventId: string, fileId: string) =>
    apiClient
      .post<EventResultAttachment>(`/events/${eventId}/result/attachments`, {
        fileId,
      })
      .then((r) => r.data),

  removeAttachment: (eventId: string, attachmentId: string) =>
    apiClient.delete(`/events/${eventId}/result/attachments/${attachmentId}`),

  reorderAttachments: (eventId: string, items: Array<{ id: string; sortOrder: number }>) =>
    apiClient
      .patch<EventResultAttachment[]>(`/events/${eventId}/result/attachments/reorder`, { items })
      .then((r) => r.data),
};
