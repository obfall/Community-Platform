import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { eventsApi } from "@/lib/api/events";
import type {
  EventQuery,
  CreateEventInput,
  UpdateEventInput,
  CreateTicketInput,
  ParticipateEventInput,
} from "@/lib/api/types";

// --- Queries ---

export function useEvents(query?: EventQuery) {
  return useQuery({
    queryKey: ["events", query],
    queryFn: () => eventsApi.getEvents(query),
    staleTime: 30 * 1000,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => eventsApi.getEvent(id!),
    enabled: !!id,
    refetchInterval: 15 * 1000, // 15秒ごとに自動リフレッシュ（残数リアルタイム把握）
  });
}

export function useCalendarEvents(from: string, to: string) {
  return useQuery({
    queryKey: ["events", "calendar", from, to],
    queryFn: () => eventsApi.getCalendarEvents(from, to),
    enabled: !!from && !!to,
    staleTime: 60 * 1000,
  });
}

export function useEventParticipants(
  eventId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["events", eventId, "participants", query],
    queryFn: () => eventsApi.getParticipants(eventId!, query),
    enabled: !!eventId,
  });
}

// --- Mutations ---

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEventInput) => eventsApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("イベントを作成しました");
    },
    onError: () => toast.error("イベントの作成に失敗しました"),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventInput }) =>
      eventsApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("イベントを更新しました");
    },
    onError: () => toast.error("イベントの更新に失敗しました"),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("イベントを削除しました");
    },
    onError: () => toast.error("イベントの削除に失敗しました"),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: CreateTicketInput }) =>
      eventsApi.createTicket(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("チケットを追加しました");
    },
    onError: () => toast.error("チケットの追加に失敗しました"),
  });
}

export function useParticipate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data?: ParticipateEventInput }) =>
      eventsApi.participate(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("参加申込しました");
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosError.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join(", ") : msg;
      toast.error(errorText ?? "参加申込に失敗しました");
    },
  });
}

export function useCancelParticipation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventsApi.cancelParticipation(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("参加をキャンセルしました");
    },
    onError: () => toast.error("キャンセルに失敗しました"),
  });
}

export function useUpdateParticipantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, status }: { participantId: string; status: string }) =>
      eventsApi.updateParticipantStatus(participantId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("ステータスを変更しました");
    },
    onError: () => toast.error("ステータスの変更に失敗しました"),
  });
}
