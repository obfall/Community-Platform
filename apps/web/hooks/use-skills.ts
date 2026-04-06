import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { skillsApi } from "@/lib/api/skills";
import type { SkillQuery } from "@/lib/api/types";

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
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("予約リクエストを送信しました");
    },
    onError: () => toast.error("予約リクエストに失敗しました"),
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      skillsApi.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", "bookings"] });
      toast.success("ステータスを更新しました");
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
