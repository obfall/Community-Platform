import { apiClient } from "./client";
import type { OrientationPage, OrientationCompletion } from "./types";

export interface OrientationPageInput {
  title: string;
  body: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export const orientationApi = {
  getPages: () => apiClient.get<OrientationPage[]>("/orientation/pages").then((r) => r.data),

  getPage: (id: string) =>
    apiClient.get<OrientationPage>(`/orientation/pages/${id}`).then((r) => r.data),

  createPage: (data: OrientationPageInput) =>
    apiClient.post<OrientationPage>("/orientation/pages", data).then((r) => r.data),

  updatePage: (id: string, data: Partial<OrientationPageInput>) =>
    apiClient.patch<OrientationPage>(`/orientation/pages/${id}`, data).then((r) => r.data),

  deletePage: (id: string) => apiClient.delete(`/orientation/pages/${id}`),

  complete: () =>
    apiClient.post<OrientationCompletion>("/orientation/complete").then((r) => r.data),

  getMyCompletion: () =>
    apiClient.get<OrientationCompletion | null>("/orientation/me").then((r) => r.data),
};
