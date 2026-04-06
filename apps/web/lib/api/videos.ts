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
};
