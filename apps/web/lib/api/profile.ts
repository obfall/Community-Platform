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
  MyProjectScheduleItem,
  LibraryItem,
  CreateLibraryItemInput,
  UpdateLibraryItemInput,
  PaginatedResponse,
} from "./types";

// マイページ一覧（チケット/予約/タスク）共通のクエリ。
// status は各エンドポイントで許可値が異なるため、ここでは緩く string で受ける。
export interface MyListQuery {
  page?: number;
  limit?: number;
  status?: string;
}

// ページングされた一覧を全ページ取得して結合する（カレンダー等、全件が必要な箇所向け）。
// 万一 meta が壊れても無限ループしないよう最大ページ数でガードする。
export async function fetchAllPaginated<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
  maxPages = 100,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  for (let i = 0; i < maxPages; i++) {
    const res = await fetchPage(page);
    all.push(...res.data);
    if (!res.meta.hasNextPage) break;
    page += 1;
  }
  return all;
}

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

  getMyTickets: (params?: MyListQuery) =>
    apiClient
      .get<PaginatedResponse<MyTicketItem>>("/users/me/tickets", { params })
      .then((r) => r.data),

  getMyReservations: (params?: MyListQuery) =>
    apiClient
      .get<PaginatedResponse<MyReservationItem>>("/users/me/reservations", { params })
      .then((r) => r.data),

  getMyTasks: (params?: MyListQuery) =>
    apiClient.get<PaginatedResponse<MyTaskItem>>("/users/me/tasks", { params }).then((r) => r.data),

  getMyProjectSchedules: () =>
    apiClient.get<MyProjectScheduleItem[]>("/users/me/project-schedules").then((r) => r.data),

  getLibrary: () => apiClient.get<LibraryItem[]>("/user-library").then((r) => r.data),

  createLibraryItem: (data: CreateLibraryItemInput) =>
    apiClient.post<LibraryItem>("/user-library", data).then((r) => r.data),

  updateLibraryItem: (id: string, data: UpdateLibraryItemInput) =>
    apiClient.patch<LibraryItem>(`/user-library/${id}`, data).then((r) => r.data),

  deleteLibraryItem: (id: string) => apiClient.delete(`/user-library/${id}`),
};
