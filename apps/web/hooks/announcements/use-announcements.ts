import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { announcementsApi, type AnnouncementInput } from "@/lib/api/announcements";

export function useAnnouncements(params?: { targetAudience?: string }) {
  return useQuery({
    queryKey: ["announcements", params],
    queryFn: () => announcementsApi.getAll(params),
  });
}

export function useAnnouncement(id: string | undefined) {
  return useQuery({
    queryKey: ["announcements", id],
    queryFn: () => announcementsApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AnnouncementInput) => announcementsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("お知らせを作成しました");
    },
    onError: () => toast.error("お知らせの作成に失敗しました"),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AnnouncementInput> }) =>
      announcementsApi.update(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements", vars.id] });
      toast.success("お知らせを更新しました");
    },
    onError: () => toast.error("お知らせの更新に失敗しました"),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("お知らせを削除しました");
    },
    onError: () => toast.error("お知らせの削除に失敗しました"),
  });
}
