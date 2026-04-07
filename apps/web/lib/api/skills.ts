import { apiClient } from "./client";
import type {
  PaginatedResponse,
  SkillListItem,
  SkillBooking,
  SkillMessage,
  SkillComment,
  SkillQuery,
} from "./types";

export const skillsApi = {
  getAll: (params?: SkillQuery) =>
    apiClient.get<PaginatedResponse<SkillListItem>>("/skills", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<SkillListItem>(`/skills/${id}`).then((r) => r.data),

  create: (data: {
    title: string;
    description?: string;
    price: number;
    durationMinutes: number;
    format?: string;
    categoryId?: string;
  }) => apiClient.post<SkillListItem>("/skills", data).then((r) => r.data),

  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      format?: string;
      status?: string;
    },
  ) => apiClient.patch<SkillListItem>(`/skills/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/skills/${id}`),

  // Bookings
  getBookings: () => apiClient.get<SkillBooking[]>("/skills/bookings").then((r) => r.data),

  createBooking: (listingId: string, data: { scheduledAt?: string; message?: string }) =>
    apiClient.post<SkillBooking>(`/skills/${listingId}/bookings`, data).then((r) => r.data),

  updateBookingStatus: (bookingId: string, status: string) =>
    apiClient.patch(`/skills/bookings/${bookingId}/status`, { status }).then((r) => r.data),

  // Messages
  getMessages: (bookingId: string) =>
    apiClient.get<SkillMessage[]>(`/skills/bookings/${bookingId}/messages`).then((r) => r.data),

  sendMessage: (bookingId: string, body: string) =>
    apiClient
      .post<SkillMessage>(`/skills/bookings/${bookingId}/messages`, { body })
      .then((r) => r.data),

  // Comments
  getComments: (listingId: string) =>
    apiClient.get<SkillComment[]>(`/skills/${listingId}/comments`).then((r) => r.data),

  addComment: (listingId: string, body: string) =>
    apiClient.post<SkillComment>(`/skills/${listingId}/comments`, { body }).then((r) => r.data),

  deleteComment: (commentId: string) => apiClient.delete(`/skills/comments/${commentId}`),
};
