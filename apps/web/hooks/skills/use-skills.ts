import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { skillsApi } from "@/lib/api/skills";
import type { SkillBookingStatus, SkillQuery } from "@/lib/api/types";

export function useSkills(query?: SkillQuery) {
  return useQuery({
    queryKey: ["skills", query],
    queryFn: () => skillsApi.getAll(query),
  });
}

export function useSkill(id: string | undefined) {
  return useQuery({
    queryKey: ["skills", id],
    queryFn: () => skillsApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: skillsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("スキルを出品しました");
    },
    onError: () => toast.error("スキル出品に失敗しました"),
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        description?: string;
        price?: number;
        durationMinutes?: number;
        format?: string;
        status?: string;
      };
    }) => skillsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["skills", variables.id] });
      toast.success("スキルを更新しました");
    },
    onError: () => toast.error("スキル更新に失敗しました"),
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => skillsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("スキルを削除しました");
    },
    onError: () => toast.error("スキル削除に失敗しました"),
  });
}

export function useSkillBookings() {
  return useQuery({
    queryKey: ["skills", "bookings"],
    queryFn: () => skillsApi.getBookings(),
  });
}

export function useSkillBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["skills", "bookings", bookingId],
    queryFn: () => skillsApi.getBooking(bookingId!),
    enabled: !!bookingId,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingId,
      data,
    }: {
      listingId: string;
      data: { scheduledAt?: string; message?: string };
    }) => skillsApi.createBooking(listingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", "bookings"] });
    },
    onError: () => toast.error("予約リクエストに失敗しました"),
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      status,
      comment,
    }: {
      bookingId: string;
      status: SkillBookingStatus;
      comment?: string;
    }) => skillsApi.updateBookingStatus(bookingId, status, comment),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["skills", "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["skills", "bookings", variables.bookingId] });
      queryClient.invalidateQueries({
        queryKey: ["skills", "messages", variables.bookingId],
      });
    },
    onError: () => toast.error("ステータス更新に失敗しました"),
  });
}

export function useSkillMessages(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["skills", "messages", bookingId],
    queryFn: () => skillsApi.getMessages(bookingId!),
    enabled: !!bookingId,
    refetchInterval: 10000,
  });
}

export function useSendSkillMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: string }) =>
      skillsApi.sendMessage(bookingId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["skills", "messages", variables.bookingId] });
    },
    onError: () => toast.error("メッセージ送信に失敗しました"),
  });
}

export function useSkillComments(listingId: string | undefined) {
  return useQuery({
    queryKey: ["skills", listingId, "comments"],
    queryFn: () => skillsApi.getComments(listingId!),
    enabled: !!listingId,
  });
}

export function useAddSkillComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, body }: { listingId: string; body: string }) =>
      skillsApi.addComment(listingId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["skills", variables.listingId, "comments"] });
      toast.success("コメントを投稿しました");
    },
    onError: () => toast.error("コメント投稿に失敗しました"),
  });
}

export function useDeleteSkillComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => skillsApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("コメントを削除しました");
    },
    onError: () => toast.error("コメント削除に失敗しました"),
  });
}
