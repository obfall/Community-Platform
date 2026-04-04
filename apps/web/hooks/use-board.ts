import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardApi } from "@/lib/api/board";
import type {
  PostListQuery,
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
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
