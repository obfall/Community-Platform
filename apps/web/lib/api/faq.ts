import { apiClient } from "./client";
import type { FaqArticle } from "./types";

export interface FaqInput {
  category: string;
  title: string;
  body: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export const faqApi = {
  getAll: (category?: string) =>
    apiClient
      .get<FaqArticle[]>("/faq", { params: category ? { category } : undefined })
      .then((r) => r.data),

  getCategories: () => apiClient.get<string[]>("/faq/categories").then((r) => r.data),

  getOne: (id: string) => apiClient.get<FaqArticle>(`/faq/${id}`).then((r) => r.data),

  create: (data: FaqInput) => apiClient.post<FaqArticle>("/faq", data).then((r) => r.data),

  update: (id: string, data: Partial<FaqInput>) =>
    apiClient.patch<FaqArticle>(`/faq/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/faq/${id}`),
};
