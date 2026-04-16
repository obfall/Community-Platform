import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { videosApi } from "@/lib/api/videos";
import type { VideoQuery, InstructorInput, TaskInput, VideoTaskStatus } from "@/lib/api/types";

export function useVideos(query?: VideoQuery) {
  return useQuery({
    queryKey: ["videos", query],
    queryFn: () => videosApi.getVideos(query),
    staleTime: 30 * 1000,
  });
}

export function useVideo(id: string | undefined) {
  return useQuery({
    queryKey: ["videos", id],
    queryFn: () => videosApi.getVideo(id!),
    enabled: !!id,
  });
}

export function useVideoProgress(videoId: string | undefined) {
  return useQuery({
    queryKey: ["videos", videoId, "progress"],
    queryFn: () => videosApi.getProgress(videoId!),
    enabled: !!videoId,
  });
}

export function useUpdateVideoProgress() {
  return useMutation({
    mutationFn: ({
      videoId,
      data,
    }: {
      videoId: string;
      data: { watchedSeconds: number; lastPositionSeconds: number; totalSeconds: number };
    }) => videosApi.updateProgress(videoId, data),
  });
}

export function useVideoCategories() {
  return useQuery({
    queryKey: ["videos", "categories"],
    queryFn: () => videosApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateVideoCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => videosApi.createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos", "categories"] });
      toast.success("カテゴリを作成しました");
    },
    onError: () => toast.error("カテゴリの作成に失敗しました"),
  });
}

export function useVideoSeries() {
  return useQuery({
    queryKey: ["videos", "series"],
    queryFn: () => videosApi.getSeries(),
    staleTime: 5 * 60 * 1000,
  });
}

/** シリーズ内で次に使う watchOrder */
export function useNextWatchOrder(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["videos", "series", seriesId, "next-watch-order"],
    queryFn: () => videosApi.getNextWatchOrder(seriesId!),
    enabled: !!seriesId,
    staleTime: 30 * 1000,
  });
}

export function useCreateVideoSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => videosApi.createSeries(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos", "series"] });
      toast.success("シリーズを作成しました");
    },
    onError: () => toast.error("シリーズの作成に失敗しました"),
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        description?: string | null;
        publishStatus?: string;
        categoryId?: string | null;
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
      };
    }) => videosApi.updateVideo(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["videos", variables.id] });
      toast.success("動画を更新しました");
    },
    onError: () => toast.error("動画の更新に失敗しました"),
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => videosApi.deleteVideo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("動画を削除しました");
    },
    onError: () => toast.error("動画の削除に失敗しました"),
  });
}

// パスワード検証
export function useVerifyVideoPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      videosApi.verifyPassword(id, password),
  });
}

// タスクステータス更新
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: VideoTaskStatus }) =>
      videosApi.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

// タスク進捗（管理者用）
export function useVideoTaskProgress(videoId: string | undefined) {
  return useQuery({
    queryKey: ["videos", videoId, "task-progress"],
    queryFn: () => videosApi.getTaskProgress(videoId!),
    enabled: !!videoId,
  });
}

// タスクリマインド
export function useSendTaskReminder() {
  return useMutation({
    mutationFn: ({
      videoId,
      taskId,
      userIds,
    }: {
      videoId: string;
      taskId: string;
      userIds: string[];
    }) => videosApi.sendTaskReminder(videoId, taskId, userIds),
    onSuccess: (data) => {
      toast.success(`${data.sentCount}件のリマインドを送信しました`);
    },
    onError: () => toast.error("リマインドの送信に失敗しました"),
  });
}

// 動画ファイル差し替え
export function useReplaceVideoFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => videosApi.replaceFile(id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["videos", variables.id] });
      toast.success("動画ファイルの差し替えを開始しました");
    },
    onError: () => toast.error("動画ファイルの差し替えに失敗しました"),
  });
}
