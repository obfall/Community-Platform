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
  UserEventItem,
  UserProjectItem,
  MyTicketItem,
  MyReservationItem,
  MyTaskItem,
  LibraryItem,
  CreateLibraryItemInput,
  UpdateLibraryItemInput,
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

  getUserAttributes: (id: string) =>
    apiClient.get<UserAttributeValue[]>(`/users/${id}/attributes`).then((r) => r.data),

  setUserAttributes: (id: string, values: SetAttributeValueItem[]) =>
    apiClient.put<UserAttributeValue[]>(`/users/${id}/attributes`, { values }).then((r) => r.data),

  exportCsv: () => apiClient.get("/users/export/csv", { responseType: "blob" }).then((r) => r.data),

  getUserEvents: (id: string) =>
    apiClient.get<UserEventItem[]>(`/users/${id}/events`).then((r) => r.data),

  getUserProjects: (id: string) =>
    apiClient.get<UserProjectItem[]>(`/users/${id}/projects`).then((r) => r.data),

  replaceAffiliations: (data: {
    affiliations: {
      organizationName: string;
      title?: string;
      roleDescription?: string;
      sortOrder?: number;
    }[];
  }) => apiClient.put("/users/me/affiliations", data).then((r) => r.data),

  getMyTickets: () => apiClient.get<MyTicketItem[]>("/users/me/tickets").then((r) => r.data),

  getMyReservations: () =>
    apiClient.get<MyReservationItem[]>("/users/me/reservations").then((r) => r.data),

  getMyTasks: () => apiClient.get<MyTaskItem[]>("/users/me/tasks").then((r) => r.data),

  getLibrary: () => apiClient.get<LibraryItem[]>("/user-library").then((r) => r.data),

  createLibraryItem: (data: CreateLibraryItemInput) =>
    apiClient.post<LibraryItem>("/user-library", data).then((r) => r.data),

  updateLibraryItem: (id: string, data: UpdateLibraryItemInput) =>
    apiClient.patch<LibraryItem>(`/user-library/${id}`, data).then((r) => r.data),

  deleteLibraryItem: (id: string) => apiClient.delete(`/user-library/${id}`),
};
