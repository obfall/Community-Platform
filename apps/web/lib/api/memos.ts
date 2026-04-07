import { apiClient } from "./client";
import type { Memo, MemoDetail, MemoCategory } from "./types";

export interface MemoInput {
  title: string;
  description?: string;
  categoryId?: string;
  attachmentFileIds?: string[];
}

export const memosApi = {
  getAll: (params?: { categoryId?: string; search?: string }) =>
    apiClient.get<Memo[]>("/memos", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<MemoDetail>(`/memos/${id}`).then((r) => r.data),

  create: (data: MemoInput) => apiClient.post<Memo>("/memos", data).then((r) => r.data),

  update: (id: string, data: Partial<MemoInput>) =>
    apiClient.patch<Memo>(`/memos/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/memos/${id}`),

  getCategories: () => apiClient.get<MemoCategory[]>("/memos/categories").then((r) => r.data),

  createCategory: (name: string) =>
    apiClient.post<MemoCategory>("/memos/categories", { name }).then((r) => r.data),

  deleteCategory: (id: string) => apiClient.delete(`/memos/categories/${id}`),
};
