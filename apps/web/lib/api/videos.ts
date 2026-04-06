import { apiClient } from "./client";
import type {
  PaginatedResponse,
  VideoListItem,
  VideoDetail,
  VideoWatchProgress,
  VideoSeries,
  VideoQuery,
} from "./types";

export const videosApi = {
  getVideos: (params?: VideoQuery) =>
    apiClient.get<PaginatedResponse<VideoListItem>>("/videos", { params }).then((r) => r.data),

  getVideo: (id: string) => apiClient.get<VideoDetail>(`/videos/${id}`).then((r) => r.data),

  updateVideo: (
    id: string,
    data: {
      title?: string;
      description?: string | null;
      publishStatus?: string;
      categoryId?: string | null;
      seriesId?: string | null;
    },
  ) => apiClient.patch<VideoDetail>(`/videos/${id}`, data).then((r) => r.data),

  deleteVideo: (id: string) => apiClient.delete(`/videos/${id}`),

  getProgress: (videoId: string) =>
    apiClient.get<VideoWatchProgress | null>(`/videos/${videoId}/progress`).then((r) => r.data),

  updateProgress: (
    videoId: string,
    data: { watchedSeconds: number; lastPositionSeconds: number; totalSeconds: number },
  ) => apiClient.post(`/videos/${videoId}/progress`, data).then((r) => r.data),

  getSeries: () => apiClient.get<VideoSeries[]>("/videos/series").then((r) => r.data),

  createSeries: (data: { name: string; description?: string }) =>
    apiClient.post("/videos/series", data).then((r) => r.data),

  getCategories: () =>
    apiClient
      .get<Array<{ id: string; name: string; sortOrder: number }>>("/videos/categories")
      .then((r) => r.data),

  createCategory: (name: string) =>
    apiClient.post("/videos/categories", { name }).then((r) => r.data),

  upload: (
    file: File,
    data: { title: string; description?: string; categoryId?: string; seriesId?: string },
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.categoryId) formData.append("categoryId", data.categoryId);
    if (data.seriesId) formData.append("seriesId", data.seriesId);
    return apiClient.post("/videos/upload", formData).then((r) => r.data);
  },
};
