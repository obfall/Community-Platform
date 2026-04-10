import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardApi } from "@/lib/api/board";
import type {
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
} from "@/lib/api/types";

// --- Queries ---

export function useCategories() {
  return useQuery({
    queryKey: ["board", "categories"],
    queryFn: () => boardApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePosts(query?: PostListQuery) {
  return useQuery({
    queryKey: ["board", "posts", query],
    queryFn: () => boardApi.getPosts(query),
    staleTime: 30 * 1000,
  });
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ["board", "posts", id],
    queryFn: () => boardApi.getPost(id!),
    enabled: !!id,
  });
}

export function useComments(postId: string | undefined, query?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["board", "comments", postId, query],
    queryFn: () => boardApi.getComments(postId!, query),
    enabled: !!postId,
  });
}

// --- Mutations ---

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) => boardApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "categories"] });
      toast.success("カテゴリを作成しました");
    },
    onError: () => toast.error("カテゴリの作成に失敗しました"),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      boardApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "categories"] });
      toast.success("カテゴリを更新しました");
    },
    onError: () => toast.error("カテゴリの更新に失敗しました"),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "categories"] });
      toast.success("カテゴリを削除しました");
    },
    onError: () => toast.error("カテゴリの削除に失敗しました"),
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderInput) => boardApi.reorderCategories(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "categories"] });
    },
    onError: () => toast.error("並び替えに失敗しました"),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostInput) => boardApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "posts"] });
      toast.success("投稿を作成しました");
    },
    onError: () => toast.error("投稿の作成に失敗しました"),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostInput }) =>
      boardApi.updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "posts"] });
      toast.success("投稿を更新しました");
    },
    onError: () => toast.error("投稿の更新に失敗しました"),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "posts"] });
      toast.success("投稿を削除しました");
    },
    onError: () => toast.error("投稿の削除に失敗しました"),
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommentInput) => boardApi.createComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["board", "posts"] });
    },
    onError: () => toast.error("コメントの投稿に失敗しました"),
  });
}

export function useTogglePostLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.togglePostLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "posts"] });
    },
  });
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.toggleCommentLike(id),
    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["board", "comments"] });
    },
  });
}

// --- Topic Queries ---

export function useTopics(query?: TopicListQuery) {
  return useQuery({
    queryKey: ["board", "topics", query],
    queryFn: () => boardApi.getTopics(query),
    staleTime: 30 * 1000,
  });
}

export function useTopic(id: string | undefined) {
  return useQuery({
    queryKey: ["board", "topics", id],
    queryFn: () => boardApi.getTopic(id!),
    enabled: !!id,
  });
}

export function useTopicPosts(
  topicId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["board", "topicPosts", topicId, query],
    queryFn: () => boardApi.getTopicPosts(topicId!, query),
    enabled: !!topicId,
  });
}

export function useTopicPostComments(
  postId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["board", "topicPostComments", postId, query],
    queryFn: () => boardApi.getTopicPostComments(postId!, query),
    enabled: !!postId,
  });
}

// --- Topic Mutations ---

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTopicInput) => boardApi.createTopic(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topics"] });
      toast.success("トピックを作成しました");
    },
    onError: () => toast.error("トピックの作成に失敗しました"),
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTopicInput }) =>
      boardApi.updateTopic(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topics"] });
      toast.success("トピックを更新しました");
    },
    onError: () => toast.error("トピックの更新に失敗しました"),
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topics"] });
      toast.success("トピックを削除しました");
    },
    onError: () => toast.error("トピックの削除に失敗しました"),
  });
}

export function useReorderTopics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderInput) => boardApi.reorderTopics(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topics"] });
    },
    onError: () => toast.error("並び替えに失敗しました"),
  });
}

export function useCreateTopicPost(topicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTopicPostInput) => boardApi.createTopicPost(topicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topicPosts", topicId] });
      queryClient.invalidateQueries({ queryKey: ["board", "topics"] });
    },
    onError: () => toast.error("投稿に失敗しました"),
  });
}

export function useCreateTopicPostComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTopicPostCommentInput) =>
      boardApi.createTopicPostComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topicPostComments", postId] });
      queryClient.invalidateQueries({ queryKey: ["board", "topicPosts"] });
    },
    onError: () => toast.error("コメントの投稿に失敗しました"),
  });
}

export function useToggleTopicLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.toggleTopicLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topics"] });
    },
  });
}

export function useToggleTopicPostLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.toggleTopicPostLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topicPosts"] });
    },
  });
}

export function useToggleTopicPostCommentLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.toggleTopicPostCommentLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", "topicPostComments"] });
    },
  });
}
