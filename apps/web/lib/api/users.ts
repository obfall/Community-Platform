import { apiClient } from "./client";
import type {
  PaginatedResponse,
  UserListItem,
  UserDetail,
  UserListQuery,
  UpdateProfileInput,
  UpdatePublicInfoInput,
  UserAttributeValue,
  SetAttributeValueItem,
} from "./types";

export const usersApi = {
  getUsers: (params?: UserListQuery) =>
    apiClient.get<PaginatedResponse<UserListItem>>("/users", { params }).then((r) => r.data),

  getUser: (id: string) => apiClient.get<UserDetail>(`/users/${id}`).then((r) => r.data),

  getMyProfile: () => apiClient.get<UserDetail>("/users/me/profile").then((r) => r.data),

  updateProfile: (data: UpdateProfileInput) =>
    apiClient.patch<UserDetail>("/users/me/profile", data).then((r) => r.data),

  updatePublicInfo: (data: UpdatePublicInfoInput) =>
    apiClient.patch<UserDetail>("/users/me/public-info", data).then((r) => r.data),

  updateRole: (id: string, role: string) =>
    apiClient.patch<UserListItem>(`/users/${id}/role`, { role }).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    apiClient.patch<UserListItem>(`/users/${id}/status`, { status }).then((r) => r.data),

  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),

  getUserAttributes: (id: string) =>
    apiClient.get<UserAttributeValue[]>(`/users/${id}/attributes`).then((r) => r.data),

  setUserAttributes: (id: string, values: SetAttributeValueItem[]) =>
    apiClient.put<UserAttributeValue[]>(`/users/${id}/attributes`, { values }).then((r) => r.data),

  exportCsv: () => apiClient.get("/users/export/csv", { responseType: "blob" }).then((r) => r.data),
};
