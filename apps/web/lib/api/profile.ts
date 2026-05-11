import { apiClient } from "./client";
import type {
  UserDetail,
  UpdateProfileInput,
  UpdatePublicInfoInput,
  UserAttributeValue,
  SetAttributeValueItem,
  UserInterestItem,
  InterestCategory,
  MyTicketItem,
  MyReservationItem,
  MyTaskItem,
  LibraryItem,
  CreateLibraryItemInput,
  UpdateLibraryItemInput,
} from "./types";

// 自分自身（/users/me/...）に対する操作と user-library を扱う API クライアント。
// app/(dashboard)/profile/ 配下のページ・hooks から参照する。
// 他者ユーザー / 管理者向けユーザー操作は lib/api/members.ts (usersApi) 側。
export const profileApi = {
  getMyProfile: () => apiClient.get<UserDetail>("/users/me/profile").then((r) => r.data),

  updateProfile: (data: UpdateProfileInput) =>
    apiClient.patch<UserDetail>("/users/me/profile", data).then((r) => r.data),

  updatePublicInfo: (data: UpdatePublicInfoInput) =>
    apiClient.patch<UserDetail>("/users/me/public-info", data).then((r) => r.data),

  replaceAffiliations: (data: {
    affiliations: {
      organizationName: string;
      title?: string;
      roleDescription?: string;
      sortOrder?: number;
    }[];
  }) => apiClient.put("/users/me/affiliations", data).then((r) => r.data),

  getMyAttributes: () =>
    apiClient.get<UserAttributeValue[]>("/users/me/attributes").then((r) => r.data),

  setMyAttributes: (values: SetAttributeValueItem[]) =>
    apiClient.patch<UserAttributeValue[]>("/users/me/attributes", { values }).then((r) => r.data),

  getInterestCategories: () =>
    apiClient.get<InterestCategory[]>("/users/interest-categories").then((r) => r.data),

  replaceInterests: (categoryIds: string[]) =>
    apiClient.put<UserInterestItem[]>("/users/me/interests", { categoryIds }).then((r) => r.data),

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
