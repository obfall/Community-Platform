import { apiClient } from "./client";
import type {
  PaginatedResponse,
  BoardCategory,
  BoardPost,
  BoardPostDetail,
  BoardComment,
  BoardTopic,
  BoardTopicPost,
  BoardTopicPostComment,
  PostListQuery,
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TopicListQuery,
  CreateTopicInput,
  UpdateTopicInput,
  CreateTopicPostInput,
  CreateTopicPostCommentInput,
  ReorderInput,
  LikeResponse,
} from "./types";

export const boardApi = {
  // カテゴリ
  getCategories: () => apiClient.get<BoardCategory[]>("/board/categories").then((r) => r.data),

  createCategory: (data: CreateCategoryInput) =>
    apiClient.post<BoardCategory>("/board/categories", data).then((r) => r.data),

  updateCategory: (id: string, data: UpdateCategoryInput) =>
    apiClient.patch<BoardCategory>(`/board/categories/${id}`, data).then((r) => r.data),

  deleteCategory: (id: string) => apiClient.delete(`/board/categories/${id}`),

  reorderCategories: (data: ReorderInput) =>
    apiClient.patch("/board/categories/reorder", data).then((r) => r.data),

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

  // トピック
  getTopics: (params?: TopicListQuery) =>
    apiClient.get<PaginatedResponse<BoardTopic>>("/board/topics", { params }).then((r) => r.data),

  getTopic: (id: string) => apiClient.get<BoardTopic>(`/board/topics/${id}`).then((r) => r.data),

  createTopic: (data: CreateTopicInput) =>
    apiClient.post<BoardTopic>("/board/topics", data).then((r) => r.data),

  updateTopic: (id: string, data: UpdateTopicInput) =>
    apiClient.patch<BoardTopic>(`/board/topics/${id}`, data).then((r) => r.data),

  deleteTopic: (id: string) => apiClient.delete(`/board/topics/${id}`),

  reorderTopics: (data: ReorderInput) =>
    apiClient.patch("/board/topics/reorder", data).then((r) => r.data),

  toggleTopicLike: (id: string) =>
    apiClient.post<LikeResponse>(`/board/topics/${id}/like`).then((r) => r.data),

  // トピック投稿
  getTopicPosts: (topicId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<BoardTopicPost>>(`/board/topics/${topicId}/posts`, { params })
      .then((r) => r.data),

  createTopicPost: (topicId: string, data: CreateTopicPostInput) =>
    apiClient.post<BoardTopicPost>(`/board/topics/${topicId}/posts`, data).then((r) => r.data),

  toggleTopicPostLike: (id: string) =>
    apiClient.post<LikeResponse>(`/board/topic-posts/${id}/like`).then((r) => r.data),

  // トピック投稿コメント
  getTopicPostComments: (postId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<BoardTopicPostComment>>(`/board/topic-posts/${postId}/comments`, {
        params,
      })
      .then((r) => r.data),

  createTopicPostComment: (postId: string, data: CreateTopicPostCommentInput) =>
    apiClient
      .post<BoardTopicPostComment>(`/board/topic-posts/${postId}/comments`, data)
      .then((r) => r.data),

  toggleTopicPostCommentLike: (id: string) =>
    apiClient.post<LikeResponse>(`/board/topic-post-comments/${id}/like`).then((r) => r.data),
};
