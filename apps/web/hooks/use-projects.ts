import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectsApi } from "@/lib/api/projects";
import type { ProjectQuery, CreateProjectInput } from "@/lib/api/types";

export function useProjects(query?: ProjectQuery) {
  return useQuery({
    queryKey: ["projects", query],
    queryFn: () => projectsApi.getProjects(query),
    staleTime: 30 * 1000,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.getProject(id!),
    enabled: !!id,
  });
}

export function useProjectThreads(
  projectId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["projects", projectId, "threads", query],
    queryFn: () => projectsApi.getThreads(projectId!, query),
    enabled: !!projectId,
  });
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => projectsApi.getTasks(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("プロジェクトを作成しました");
    },
    onError: () => toast.error("プロジェクトの作成に失敗しました"),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectInput> }) =>
      projectsApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("プロジェクトを更新しました");
    },
    onError: () => toast.error("プロジェクトの更新に失敗しました"),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("プロジェクトを削除しました");
    },
    onError: () => toast.error("プロジェクトの削除に失敗しました"),
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, title }: { projectId: string; title: string }) =>
      projectsApi.createThread(projectId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("メッセージを作成しました");
    },
    onError: () => toast.error("メッセージの作成に失敗しました"),
  });
}

export function useThreadReplies(threadId: string | undefined) {
  return useQuery({
    queryKey: ["projects", "threads", threadId, "replies"],
    queryFn: () => projectsApi.getReplies(threadId!),
    enabled: !!threadId,
  });
}

export function useCreateReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      projectsApi.createReply(threadId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("返信しました");
    },
    onError: () => toast.error("返信に失敗しました"),
  });
}

export function useToggleThreadLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => projectsApi.toggleThreadLike(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useToggleReplyLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (replyId: string) => projectsApi.toggleReplyLike(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        title: string;
        description?: string;
        dueDate?: string;
        requestedDate?: string;
        assigneeIds?: string[];
        fileIds?: string[];
      };
    }) => projectsApi.createTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("タスクを追加しました");
    },
    onError: () => toast.error("タスクの追加に失敗しました"),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: { title?: string; progress?: number; dueDate?: string };
    }) => projectsApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("タスクを更新しました");
    },
    onError: () => toast.error("タスクの更新に失敗しました"),
  });
}

// ========== Board ==========

export function useProjectBoardPosts(
  projectId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["projects", projectId, "board", query],
    queryFn: () => projectsApi.getBoardPosts(projectId!, query),
    enabled: !!projectId,
  });
}

export function useCreateBoardPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { title: string; body: string };
    }) => projectsApi.createBoardPost(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("投稿しました");
    },
    onError: () => toast.error("投稿に失敗しました"),
  });
}

export function useBoardComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["projects", "board", postId, "comments"],
    queryFn: () => projectsApi.getBoardComments(postId!),
    enabled: !!postId,
  });
}

export function useCreateBoardComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) =>
      projectsApi.createBoardComment(postId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("コメントしました");
    },
    onError: () => toast.error("コメントに失敗しました"),
  });
}
