import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBoardApi } from "@/lib/api/board";
import { useBoardScope, boardScopeKey, type BoardScope } from "@/components/board/board-scope";
import { BOARD_LIMITS, BOARD_STALE_TIME, BOARD_TOAST_MESSAGES } from "@/components/board/constants";
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
    staleTime: BOARD_STALE_TIME.categories,
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
      toast.success(BOARD_TOAST_MESSAGES.categoryCreated);
    },
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
      toast.success(BOARD_TOAST_MESSAGES.categoryUpdated);
    },
  });
}

export function useDeleteCategory() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "categories") });
      toast.success(BOARD_TOAST_MESSAGES.categoryDeleted);
    },
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
  });
}

// --- Topic Queries ---

export function useTopics(query?: TopicListQuery, options?: { enabled?: boolean }) {
  const { api, scope } = useBoardApi();
  return useQuery({
    queryKey: keyOf(scope, "topics", query),
    queryFn: () => api.getTopics(query),
    enabled: options?.enabled ?? true,
    staleTime: BOARD_STALE_TIME.topics,
  });
}

/**
 * 検索キーワード hit を持つトピックを横断検索で取得（カテゴリ別表示用）。
 * 結果を BoardView 側でカテゴリ別にグルーピングして表示する。
 * limit は API の MAX_PAGE_SIZE 上限（100）。これを超える検索結果は表示対象外。
 */
export function useTopicSearchCategoryHits(search: string | undefined) {
  const { api, scope } = useBoardApi();
  return useQuery({
    queryKey: keyOf(scope, "topics", "category-hits", search),
    queryFn: () => api.getTopics({ search, limit: BOARD_LIMITS.searchOverview }),
    enabled: !!search,
    staleTime: BOARD_STALE_TIME.topics,
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
      toast.success(BOARD_TOAST_MESSAGES.topicCreated);
    },
  });
}

export function useUpdateTopic() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTopicInput }) => api.updateTopic(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
      toast.success(BOARD_TOAST_MESSAGES.topicUpdated);
    },
  });
}

export function useDeleteTopic() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
      toast.success(BOARD_TOAST_MESSAGES.topicDeleted);
    },
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
  });
}

export function useUpdateTopicPost() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.updateTopicPost(id, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topicPosts") });
      toast.success(BOARD_TOAST_MESSAGES.postUpdated);
    },
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
      toast.success(BOARD_TOAST_MESSAGES.postDeleted);
    },
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
      toast.success(BOARD_TOAST_MESSAGES.commentUpdated);
    },
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
      toast.success(BOARD_TOAST_MESSAGES.commentDeleted);
    },
  });
}

export function useToggleTopicPin() {
  const { api, scope } = useBoardApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleTopicPin(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keyOf(scope, "topics") });
      toast.success(
        data.isPinned ? BOARD_TOAST_MESSAGES.topicPinned : BOARD_TOAST_MESSAGES.topicUnpinned,
      );
    },
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
