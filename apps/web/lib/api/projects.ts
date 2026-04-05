import { apiClient } from "./client";
import type {
  PaginatedResponse,
  ProjectListItem,
  ProjectDetail,
  ProjectThread,
  ProjectTask,
  ProjectQuery,
  CreateProjectInput,
} from "./types";

export const projectsApi = {
  getProjects: (params?: ProjectQuery) =>
    apiClient.get<PaginatedResponse<ProjectListItem>>("/projects", { params }).then((r) => r.data),

  getProject: (id: string) => apiClient.get<ProjectDetail>(`/projects/${id}`).then((r) => r.data),

  createProject: (data: CreateProjectInput) =>
    apiClient.post<ProjectDetail>("/projects", data).then((r) => r.data),

  updateProject: (
    id: string,
    data: Partial<CreateProjectInput> & { publishStatus?: string; inviteLinkEnabled?: boolean },
  ) => apiClient.patch<ProjectDetail>(`/projects/${id}`, data).then((r) => r.data),

  deleteProject: (id: string) => apiClient.delete(`/projects/${id}`),

  joinByToken: (token: string) =>
    apiClient.post<ProjectDetail>(`/projects/join/${token}`).then((r) => r.data),

  addMember: (projectId: string, userId: string) =>
    apiClient.post(`/projects/${projectId}/members/${userId}`),

  removeMember: (projectId: string, userId: string) =>
    apiClient.delete(`/projects/${projectId}/members/${userId}`),

  getThreads: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<ProjectThread>>(`/projects/${projectId}/threads`, { params })
      .then((r) => r.data),

  createThread: (projectId: string, title: string) =>
    apiClient.post(`/projects/${projectId}/threads`, { title }).then((r) => r.data),

  getReplies: (threadId: string) =>
    apiClient.get(`/projects/threads/${threadId}/replies`).then((r) => r.data),

  createReply: (threadId: string, body: string) =>
    apiClient.post(`/projects/threads/${threadId}/replies`, { body }).then((r) => r.data),

  toggleThreadLike: (threadId: string) =>
    apiClient.post<{ liked: boolean }>(`/projects/threads/${threadId}/like`).then((r) => r.data),

  toggleReplyLike: (replyId: string) =>
    apiClient.post<{ liked: boolean }>(`/projects/replies/${replyId}/like`).then((r) => r.data),

  getTasks: (projectId: string) =>
    apiClient.get<ProjectTask[]>(`/projects/${projectId}/tasks`).then((r) => r.data),

  createTask: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      dueDate?: string;
      requestedDate?: string;
      assigneeIds?: string[];
      fileIds?: string[];
    },
  ) => apiClient.post(`/projects/${projectId}/tasks`, data).then((r) => r.data),

  updateTask: (taskId: string, data: { title?: string; progress?: number; dueDate?: string }) =>
    apiClient.patch(`/projects/tasks/${taskId}`, data).then((r) => r.data),

  getBoardPosts: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/projects/${projectId}/board`, { params }).then((r) => r.data),

  createBoardPost: (projectId: string, data: { title: string; body: string }) =>
    apiClient.post(`/projects/${projectId}/board`, data).then((r) => r.data),

  getBoardComments: (postId: string) =>
    apiClient.get(`/projects/board/${postId}/comments`).then((r) => r.data),

  createBoardComment: (postId: string, body: string) =>
    apiClient.post(`/projects/board/${postId}/comments`, { body }).then((r) => r.data),
};
