import { apiClient } from "./client";
import { boardBasePath, type BoardScope } from "@/components/board/board-scope";
import type {
  PaginatedResponse,
  BoardCategory,
  BoardTopic,
  BoardTopicPost,
  BoardTopicPostComment,
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

/**
 * スコープに応じた API クライアントを生成する。
 * Global/Project/Event のどのスコープでも同じメソッド群を提供する。
 */
export function createBoardApi(scope: BoardScope) {
  const base = boardBasePath(scope);

  return {
    // カテゴリ
    getCategories: () => apiClient.get<BoardCategory[]>(`${base}/categories`).then((r) => r.data),

    createCategory: (data: CreateCategoryInput) =>
      apiClient.post<BoardCategory>(`${base}/categories`, data).then((r) => r.data),

    updateCategory: (id: string, data: UpdateCategoryInput) =>
      apiClient.patch<BoardCategory>(`${base}/categories/${id}`, data).then((r) => r.data),

    deleteCategory: (id: string) => apiClient.delete(`${base}/categories/${id}`),

    reorderCategories: (data: ReorderInput) =>
      apiClient.patch(`${base}/categories/reorder`, data).then((r) => r.data),

    // トピック
    getTopics: (params?: TopicListQuery) =>
      apiClient
        .get<PaginatedResponse<BoardTopic>>(`${base}/topics`, { params })
        .then((r) => r.data),

    getTopic: (id: string) => apiClient.get<BoardTopic>(`${base}/topics/${id}`).then((r) => r.data),

    createTopic: (data: CreateTopicInput) =>
      apiClient.post<BoardTopic>(`${base}/topics`, data).then((r) => r.data),

    updateTopic: (id: string, data: UpdateTopicInput) =>
      apiClient.patch<BoardTopic>(`${base}/topics/${id}`, data).then((r) => r.data),

    deleteTopic: (id: string) => apiClient.delete(`${base}/topics/${id}`),

    reorderTopics: (data: ReorderInput) =>
      apiClient.patch(`${base}/topics/reorder`, data).then((r) => r.data),

    toggleTopicLike: (id: string) =>
      apiClient.post<LikeResponse>(`${base}/topics/${id}/like`).then((r) => r.data),

    // トピック投稿
    getTopicPosts: (topicId: string, params?: { page?: number; limit?: number }) =>
      apiClient
        .get<PaginatedResponse<BoardTopicPost>>(`${base}/topics/${topicId}/posts`, { params })
        .then((r) => r.data),

    createTopicPost: (topicId: string, data: CreateTopicPostInput) =>
      apiClient.post<BoardTopicPost>(`${base}/topics/${topicId}/posts`, data).then((r) => r.data),

    updateTopicPost: (id: string, data: { body: string }) =>
      apiClient.patch<BoardTopicPost>(`${base}/topic-posts/${id}`, data).then((r) => r.data),

    deleteTopicPost: (id: string) => apiClient.delete(`${base}/topic-posts/${id}`),

    toggleTopicPostLike: (id: string) =>
      apiClient.post<LikeResponse>(`${base}/topic-posts/${id}/like`).then((r) => r.data),

    // トピック投稿コメント
    getTopicPostComments: (postId: string, params?: { page?: number; limit?: number }) =>
      apiClient
        .get<PaginatedResponse<BoardTopicPostComment>>(`${base}/topic-posts/${postId}/comments`, {
          params,
        })
        .then((r) => r.data),

    createTopicPostComment: (postId: string, data: CreateTopicPostCommentInput) =>
      apiClient
        .post<BoardTopicPostComment>(`${base}/topic-posts/${postId}/comments`, data)
        .then((r) => r.data),

    updateTopicPostComment: (id: string, data: { body: string }) =>
      apiClient
        .patch<BoardTopicPostComment>(`${base}/topic-post-comments/${id}`, data)
        .then((r) => r.data),

    deleteTopicPostComment: (id: string) => apiClient.delete(`${base}/topic-post-comments/${id}`),

    toggleTopicPostCommentLike: (id: string) =>
      apiClient.post<LikeResponse>(`${base}/topic-post-comments/${id}/like`).then((r) => r.data),
  };
}

/** 後方互換: Global scope の API クライアント */
export const boardApi = createBoardApi({ kind: "global" });
