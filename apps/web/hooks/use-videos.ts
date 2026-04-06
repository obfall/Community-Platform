import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { videosApi } from "@/lib/api/videos";
import type { VideoQuery } from "@/lib/api/types";

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
