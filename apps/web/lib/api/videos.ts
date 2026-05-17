import { apiClient } from "./client";
import type {
  PaginatedResponse,
  VideoListItem,
  VideoDetail,
  VideoWatchProgress,
  VideoSeries,
  VideoQuery,
  VideoTaskProgress,
  VideoTaskStatus,
  InstructorInput,
  TaskInput,
} from "./types";

interface UploadPayload {
  title: string;
  description?: string;
  seriesId?: string;
  watchOrder?: number;
  publishStatus?: string;
  availableUntil?: string;
  viewPermission?: string;
  allowedRoles?: string[];
  password?: string;
  instructors?: InstructorInput[];
  attachmentFileIds?: string[];
  tasks?: TaskInput[];
}

interface UpdatePayload {
  title?: string;
  description?: string | null;
  publishStatus?: string;
  seriesId?: string | null;
  watchOrder?: number | null;
  availableUntil?: string | null;
  viewPermission?: string;
  allowedRoles?: string[];
  requiredRankId?: string | null;
  password?: string | null;
  instructors?: InstructorInput[];
  attachmentFileIds?: string[];
  tasks?: TaskInput[];
}

export const videosApi = {
  getVideos: (params?: VideoQuery) =>
    apiClient.get<PaginatedResponse<VideoListItem>>("/videos", { params }).then((r) => r.data),

  getVideo: (id: string) => apiClient.get<VideoDetail>(`/videos/${id}`).then((r) => r.data),

  updateVideo: (id: string, data: UpdatePayload) =>
    apiClient.patch<VideoDetail>(`/videos/${id}`, data).then((r) => r.data),

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

  getNextWatchOrder: (seriesId: string) =>
    apiClient
      .get<{ nextOrder: number }>(`/videos/series/${seriesId}/next-watch-order`)
      .then((r) => r.data),

  upload: (file: File, data: UploadPayload) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.seriesId) formData.append("seriesId", data.seriesId);
    if (data.watchOrder != null) formData.append("watchOrder", String(data.watchOrder));
    if (data.publishStatus) formData.append("publishStatus", data.publishStatus);
    if (data.availableUntil) formData.append("availableUntil", data.availableUntil);
    if (data.viewPermission) formData.append("viewPermission", data.viewPermission);
    if (data.allowedRoles?.length)
      formData.append("allowedRoles", JSON.stringify(data.allowedRoles));
    if (data.password) formData.append("password", data.password);
    if (data.instructors?.length) formData.append("instructors", JSON.stringify(data.instructors));
    if (data.attachmentFileIds?.length)
      formData.append("attachmentFileIds", JSON.stringify(data.attachmentFileIds));
    if (data.tasks?.length) formData.append("tasks", JSON.stringify(data.tasks));
    return apiClient.post("/videos/upload", formData).then((r) => r.data);
  },

  // パスワード検証
  verifyPassword: (id: string, password: string) =>
    apiClient
      .post<{ ok: boolean }>(`/videos/${id}/verify-password`, { password })
      .then((r) => r.data),

  // タスクステータス更新
  updateTaskStatus: (taskId: string, status: VideoTaskStatus) =>
    apiClient
      .patch<{
        status: VideoTaskStatus;
        completedAt?: string | null;
        statusUpdatedAt?: string;
      }>(`/videos/tasks/${taskId}/status`, { status })
      .then((r) => r.data),

  // タスク進捗（管理者用）
  getTaskProgress: (videoId: string) =>
    apiClient.get<VideoTaskProgress>(`/videos/${videoId}/task-progress`).then((r) => r.data),

  // タスクリマインド
  sendTaskReminder: (videoId: string, taskId: string, userIds: string[]) =>
    apiClient
      .post<{ sentCount: number }>(`/videos/${videoId}/tasks/${taskId}/remind`, { userIds })
      .then((r) => r.data),

  // 動画ファイル差し替え
  replaceFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(`/videos/${id}/replace-file`, formData).then((r) => r.data);
  },
};
