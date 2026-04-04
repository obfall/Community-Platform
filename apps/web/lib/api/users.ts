import { apiClient } from "./client";
import type {
  PaginatedResponse,
  UserListItem,
  UserDetail,
  UserListQuery,
  UpdateProfileInput,
  UpdatePublicInfoInput,
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
};
