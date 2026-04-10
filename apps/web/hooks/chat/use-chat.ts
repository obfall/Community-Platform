import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chatApi } from "@/lib/api/chat";
import type { CreateChatRoomInput, UpdateChatRoomInput } from "@/lib/api/types";

// --- Queries ---

export function useChatRooms() {
  return useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => chatApi.getRooms(),
    staleTime: 10 * 1000,
  });
}

export function useChatRoom(id: string | undefined) {
  return useQuery({
    queryKey: ["chat", "rooms", id],
    queryFn: () => chatApi.getRoom(id!),
    enabled: !!id,
  });
}

export function useChatMessages(
  roomId: string | undefined,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["chat", "messages", roomId, query],
    queryFn: () => chatApi.getMessages(roomId!, query),
    enabled: !!roomId,
    staleTime: 5 * 1000,
  });
}

// --- Mutations ---

export function useCreateChatRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChatRoomInput) => chatApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success("チャットルームを作成しました");
    },
    onError: () => toast.error("ルームの作成に失敗しました"),
  });
}

export function useUpdateChatRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChatRoomInput }) =>
      chatApi.updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success("ルームを更新しました");
    },
    onError: () => toast.error("ルームの更新に失敗しました"),
  });
}

export function useAddChatMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      chatApi.addMember(roomId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success("メンバーを追加しました");
    },
    onError: () => toast.error("メンバーの追加に失敗しました"),
  });
}

export function useRemoveChatMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      chatApi.removeMember(roomId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success("メンバーを削除しました");
    },
    onError: () => toast.error("メンバーの削除に失敗しました"),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => chatApi.markAsRead(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    },
  });
}

export function useToggleMute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => chatApi.toggleMute(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    },
  });
}
