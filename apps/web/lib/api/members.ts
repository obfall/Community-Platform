import { apiClient } from "./client";
import type {
  PaginatedResponse,
  UserListItem,
  UserDetail,
  UserListQuery,
  UserAttributeValue,
  SetAttributeValueItem,
  UserEventItem,
  UserProjectItem,
} from "./types";

// 他者ユーザー / 管理者向けユーザー操作を扱う API クライアント。
// app/(dashboard)/members/ および app/(dashboard)/settings/members/ から参照する。
// 自分自身（/users/me/...）に対する操作は lib/api/profile.ts (profileApi) 側。
export const usersApi = {
  getUsers: (params?: UserListQuery) =>
    apiClient.get<PaginatedResponse<UserListItem>>("/users", { params }).then((r) => r.data),

  getUser: (id: string) => apiClient.get<UserDetail>(`/users/${id}`).then((r) => r.data),

  updateRole: (id: string, role: string) =>
    apiClient.patch<UserListItem>(`/users/${id}/role`, { role }).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    apiClient.patch<UserListItem>(`/users/${id}/status`, { status }).then((r) => r.data),

  forcePasswordReset: (id: string) =>
    apiClient.post<{ success: true }>(`/users/${id}/force-password-reset`).then((r) => r.data),

  updateEmail: (id: string, email: string) =>
    apiClient.patch<UserDetail>(`/users/${id}/email`, { email }).then((r) => r.data),

  getUserAttributes: (id: string) =>
    apiClient.get<UserAttributeValue[]>(`/users/${id}/attributes`).then((r) => r.data),

  setUserAttributes: (id: string, values: SetAttributeValueItem[]) =>
    apiClient
      .patch<UserAttributeValue[]>(`/users/${id}/attributes`, { values })
      .then((r) => r.data),

  exportCsv: (params?: UserListQuery) =>
    apiClient.get("/users/export/csv", { params, responseType: "blob" }).then((r) => r.data),

  getUserEvents: (id: string) =>
    apiClient.get<UserEventItem[]>(`/users/${id}/events`).then((r) => r.data),

  getUserProjects: (id: string) =>
    apiClient.get<UserProjectItem[]>(`/users/${id}/projects`).then((r) => r.data),
};
