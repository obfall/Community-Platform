import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { chatApi } from "@/lib/api/chat";
import type { CreateChatRoomInput, UpdateChatRoomInput } from "@/lib/api/types";

// --- Queries ---

export function useChatRooms() {
  return useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => chatApi.getRooms(),
    staleTime: 10 * 1000,
    // 未読バッジを画面遷移なしでも更新するため、タブ表示中だけ 60 秒ごとに refetch
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
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
  const t = useTranslations("chat.toast");
  return useMutation({
    mutationFn: (data: CreateChatRoomInput) => chatApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success(t("roomCreated"));
    },
    onError: () => toast.error(t("roomCreateFailed"), { id: "chat-room-create-error" }),
  });
}

// 既存の DM ルームを取得 or 新規作成して開くための静かな mutation（成功 toast 無し）。
// バック側の POST /chat/rooms (type=dm) は既存ルームがあればそれを返す。
export function useOpenDmRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) =>
      chatApi.createRoom({ type: "dm", memberIds: [otherUserId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    },
  });
}

export function useUpdateChatRoom() {
  const queryClient = useQueryClient();
  const t = useTranslations("chat.toast");
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChatRoomInput }) =>
      chatApi.updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success(t("roomUpdated"));
    },
    onError: () => toast.error(t("roomUpdateFailed"), { id: "chat-room-update-error" }),
  });
}

export function useAddChatMember() {
  const queryClient = useQueryClient();
  const t = useTranslations("chat.toast");
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      chatApi.addMember(roomId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success(t("memberAdded"));
    },
    onError: () => toast.error(t("memberAddFailed"), { id: "chat-member-add-error" }),
  });
}

export function useRemoveChatMember() {
  const queryClient = useQueryClient();
  const t = useTranslations("chat.toast");
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      chatApi.removeMember(roomId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      toast.success(t("memberRemoved"));
    },
    onError: () => toast.error(t("memberRemoveFailed"), { id: "chat-member-remove-error" }),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => chatApi.markAsRead(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
