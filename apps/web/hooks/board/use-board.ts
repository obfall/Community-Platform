import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBoardApi } from "@/lib/api/board";
import { useBoardScope, boardScopeKey, type BoardScope } from "@/components/board/board-scope";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  TopicListQuery,
  CreateTopicInput,
  UpdateTopicInput,
  CreateTopicPostInput,
  CreateTopicPostCommentInput,
  ReorderInput,
} from "@/lib/api/types";

/** scope-aware API クライアントを取得 */
function useBoardApi() {
  const scope = useBoardScope();
  return { api: createBoardApi(scope), scope };
}

function keyOf(scope: BoardScope, ...parts: readonly unknown[]): readonly unknown[] {
  return ["board", ...boardScopeKey(scope), ...parts];
}

// --- Queries ---

export function useCategories() {
  const { api, scope } = useBoardApi();
  return useQuery({
    queryKey: keyOf(scope, "categories"),
    queryFn: () => api.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Mutations ---

export function useCreateCategory() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) => api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "categories") });
      toast.success("カテゴリを作成しました");
    },
    onError: () => toast.error("カテゴリの作成に失敗しました"),
  });
}

export function useUpdateCategory() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "categories") });
      toast.success("カテゴリを更新しました");
    },
    onError: () => toast.error("カテゴリの更新に失敗しました"),
  });
}

export function useDeleteCategory() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "categories") });
      toast.success("カテゴリを削除しました");
    },
    onError: () => toast.error("カテゴリの削除に失敗しました"),
  });
}

export function useReorderCategories() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderInput) => api.reorderCategories(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "categories") });
    },
    onError: () => toast.error("並び替えに失敗しました"),
  });
}

// --- Topic Queries ---

export function useTopics(query?: TopicListQuery) {
  const { api, scope } = useBoardApi();
  return useQuery({
    queryKey: keyOf(scope, "topics", query),
    queryFn: () => api.getTopics(query),
    staleTime: 30 * 1000,
  });
}

export function useTopic(id: string | undefined) {
  const { api, scope } = useBoardApi();
  return useQuery({
    queryKey: keyOf(scope, "topics", id),
    queryFn: () => api.getTopic(id!),
    enabled: !!id,
  });
}

export function useTopicPosts(
  topicId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  const { api, scope } = useBoardApi();
  return useQuery({
    queryKey: keyOf(scope, "topicPosts", topicId, query),
    queryFn: () => api.getTopicPosts(topicId!, query),
    enabled: !!topicId,
  });
}

export function useTopicPostComments(
  postId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  const { api, scope } = useBoardApi();
  return useQuery({
    queryKey: keyOf(scope, "topicPostComments", postId, query),
    queryFn: () => api.getTopicPostComments(postId!, query),
    enabled: !!postId,
  });
}

// --- Topic Mutations ---

export function useCreateTopic() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTopicInput) => api.createTopic(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
      toast.success("トピックを作成しました");
    },
    onError: () => toast.error("トピックの作成に失敗しました"),
  });
}

export function useUpdateTopic() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTopicInput }) => api.updateTopic(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
      toast.success("トピックを更新しました");
    },
    onError: () => toast.error("トピックの更新に失敗しました"),
  });
}

export function useDeleteTopic() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
      toast.success("トピックを削除しました");
    },
    onError: () => toast.error("トピックの削除に失敗しました"),
  });
}

export function useReorderTopics() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderInput) => api.reorderTopics(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
    },
    onError: () => toast.error("並び替えに失敗しました"),
  });
}

export function useCreateTopicPost(topicId: string) {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTopicPostInput) => api.createTopicPost(topicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPosts", topicId) });
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
    },
    onError: () => toast.error("投稿に失敗しました"),
  });
}

export function useUpdateTopicPost() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.updateTopicPost(id, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPosts") });
      toast.success("投稿を更新しました");
    },
    onError: () => toast.error("投稿の更新に失敗しました"),
  });
}

export function useDeleteTopicPost() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTopicPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPosts") });
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
      toast.success("投稿を削除しました");
    },
    onError: () => toast.error("投稿の削除に失敗しました"),
  });
}

export function useCreateTopicPostComment(postId: string) {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTopicPostCommentInput) => api.createTopicPostComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPostComments", postId) });
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPosts") });
    },
    onError: () => toast.error("コメントの投稿に失敗しました"),
  });
}

export function useUpdateTopicPostComment() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.updateTopicPostComment(id, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPostComments") });
      toast.success("コメントを更新しました");
    },
    onError: () => toast.error("コメントの更新に失敗しました"),
  });
}

export function useDeleteTopicPostComment() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTopicPostComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPostComments") });
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPosts") });
      toast.success("コメントを削除しました");
    },
    onError: () => toast.error("コメントの削除に失敗しました"),
  });
}

export function useToggleTopicLike() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleTopicLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
    },
  });
}

export function useToggleTopicPostLike() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleTopicPostLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPosts") });
    },
  });
}

export function useToggleTopicPostCommentLike() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleTopicPostCommentLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPostComments") });
    },
  });
}
