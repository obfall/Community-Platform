import { apiClient } from "./client";
import type {
  PaginatedResponse,
  BoardCategory,
  BoardPost,
  BoardPostDetail,
  BoardComment,
  PostListQuery,
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  LikeResponse,
} from "./types";

export const boardApi = {
  // カテゴリ
  getCategories: () => apiClient.get<BoardCategory[]>("/board/categories").then((r) => r.data),

  // 投稿
  getPosts: (params?: PostListQuery) =>
    apiClient.get<PaginatedResponse<BoardPost>>("/board/posts", { params }).then((r) => r.data),

  getPost: (id: string) => apiClient.get<BoardPostDetail>(`/board/posts/${id}`).then((r) => r.data),

  createPost: (data: CreatePostInput) =>
    apiClient.post<BoardPost>("/board/posts", data).then((r) => r.data),

  updatePost: (id: string, data: UpdatePostInput) =>
    apiClient.patch<BoardPost>(`/board/posts/${id}`, data).then((r) => r.data),

  deletePost: (id: string) => apiClient.delete(`/board/posts/${id}`),

  togglePin: (id: string) =>
    apiClient.patch<{ isPinned: boolean }>(`/board/posts/${id}/pin`).then((r) => r.data),

  // コメント
  getComments: (postId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<BoardComment>>(`/board/posts/${postId}/comments`, { params })
      .then((r) => r.data),

  createComment: (postId: string, data: CreateCommentInput) =>
    apiClient.post<BoardComment>(`/board/posts/${postId}/comments`, data).then((r) => r.data),

  updateComment: (id: string, data: { body: string }) =>
    apiClient.patch<BoardComment>(`/board/comments/${id}`, data).then((r) => r.data),

  deleteComment: (id: string) => apiClient.delete(`/board/comments/${id}`),

  // いいね
  togglePostLike: (id: string) =>
    apiClient.post<LikeResponse>(`/board/posts/${id}/like`).then((r) => r.data),

  toggleCommentLike: (id: string) =>
    apiClient.post<LikeResponse>(`/board/comments/${id}/like`).then((r) => r.data),
};
