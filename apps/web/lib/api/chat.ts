import { apiClient } from "./client";
import type {
  PaginatedResponse,
  ChatRoom,
  ChatMessage,
  CreateChatRoomInput,
  UpdateChatRoomInput,
} from "./types";

export const chatApi = {
  getRooms: () => apiClient.get<ChatRoom[]>("/chat/rooms").then((r) => r.data),

  createRoom: (data: CreateChatRoomInput) =>
    apiClient.post<ChatRoom>("/chat/rooms", data).then((r) => r.data),

  getRoom: (id: string) => apiClient.get<ChatRoom>(`/chat/rooms/${id}`).then((r) => r.data),

  updateRoom: (id: string, data: UpdateChatRoomInput) =>
    apiClient.patch<ChatRoom>(`/chat/rooms/${id}`, data).then((r) => r.data),

  getMessages: (roomId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<ChatMessage>>(`/chat/rooms/${roomId}/messages`, { params })
      .then((r) => r.data),

  addMember: (roomId: string, userId: string) =>
    apiClient.post<ChatRoom>(`/chat/rooms/${roomId}/members`, { userId }).then((r) => r.data),

  removeMember: (roomId: string, userId: string) =>
    apiClient.delete(`/chat/rooms/${roomId}/members/${userId}`),

  markAsRead: (roomId: string) => apiClient.patch(`/chat/rooms/${roomId}/read`),

  toggleMute: (roomId: string) =>
    apiClient.patch<{ isMuted: boolean }>(`/chat/rooms/${roomId}/mute`).then((r) => r.data),
};
