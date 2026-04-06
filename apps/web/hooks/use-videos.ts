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

export function useVideoSeries() {
  return useQuery({
    queryKey: ["videos", "series"],
    queryFn: () => videosApi.getSeries(),
    staleTime: 5 * 60 * 1000,
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
