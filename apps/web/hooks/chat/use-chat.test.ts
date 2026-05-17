import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

// chatApi / sonner をモック（vi.hoisted で hoisting に対応）
const { apiMock, toastMock } = vi.hoisted(() => ({
  apiMock: {
    getRooms: vi.fn(),
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    updateRoom: vi.fn(),
    getMessages: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    markAsRead: vi.fn(),
    toggleMute: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/chat", () => ({
  chatApi: apiMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  useChatRooms,
  useChatRoom,
  useChatMessages,
  useCreateChatRoom,
  useUpdateChatRoom,
  useAddChatMember,
  useRemoveChatMember,
  useMarkAsRead,
  useToggleMute,
} from "./use-chat";

describe("chat hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useChatRooms: ルーム一覧取得", () => {
    it("chatApi.getRooms を呼んでデータを返す", async () => {
      apiMock.getRooms.mockResolvedValue([{ id: "r-1" }]);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useChatRooms(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([{ id: "r-1" }]);
      expect(apiMock.getRooms).toHaveBeenCalled();
    });
  });

  describe("useChatRoom: ルーム詳細取得", () => {
    it("id が undefined なら fetch しない", async () => {
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useChatRoom(undefined), { wrapper });

      // enabled: false の状態は同期的に決まる。waitFor で安定化させてから検証する。
      await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
      expect(apiMock.getRoom).not.toHaveBeenCalled();
    });

    it("id 指定で chatApi.getRoom を呼ぶ", async () => {
      apiMock.getRoom.mockResolvedValue({ id: "r-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useChatRoom("r-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getRoom).toHaveBeenCalledWith("r-1");
    });
  });

  describe("useChatMessages: メッセージ一覧取得", () => {
    it("roomId が undefined なら fetch しない", async () => {
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useChatMessages(undefined), { wrapper });

      await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
      expect(apiMock.getMessages).not.toHaveBeenCalled();
    });

    it("roomId + query を chatApi.getMessages に渡す", async () => {
      apiMock.getMessages.mockResolvedValue({ data: [], meta: {} });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useChatMessages("r-1", { limit: 50 }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getMessages).toHaveBeenCalledWith("r-1", { limit: 50 });
    });
  });

  describe("useCreateChatRoom: ルーム作成", () => {
    it("成功時に toast.success と invalidateQueries が呼ばれる", async () => {
      apiMock.createRoom.mockResolvedValue({ id: "r-1" });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useCreateChatRoom(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          type: "dm",
          memberIds: ["u-2"],
        } as never);
      });

      expect(apiMock.createRoom).toHaveBeenCalledWith({ type: "dm", memberIds: ["u-2"] });
      expect(toastMock.success).toHaveBeenCalledWith("チャットルームを作成しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chat", "rooms"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.createRoom.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateChatRoom(), { wrapper });

      await act(async () => {
        await result.current
          .mutateAsync({ type: "dm", memberIds: ["u-2"] } as never)
          .catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("ルームの作成に失敗しました", {
        id: "chat-room-create-error",
      });
    });
  });

  describe("useUpdateChatRoom: ルーム更新", () => {
    it("成功時に toast.success と invalidateQueries が呼ばれる", async () => {
      apiMock.updateRoom.mockResolvedValue({ id: "r-1" });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useUpdateChatRoom(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "r-1", data: { name: "new" } });
      });

      expect(apiMock.updateRoom).toHaveBeenCalledWith("r-1", { name: "new" });
      expect(toastMock.success).toHaveBeenCalledWith("ルームを更新しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chat", "rooms"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.updateRoom.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateChatRoom(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "r-1", data: { name: "new" } }).catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("ルームの更新に失敗しました", {
        id: "chat-room-update-error",
      });
    });
  });

  describe("useAddChatMember: メンバー追加", () => {
    it("成功時に chatApi.addMember + toast.success", async () => {
      apiMock.addMember.mockResolvedValue({ id: "r-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAddChatMember(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ roomId: "r-1", userId: "u-2" });
      });

      expect(apiMock.addMember).toHaveBeenCalledWith("r-1", "u-2");
      expect(toastMock.success).toHaveBeenCalledWith("メンバーを追加しました");
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.addMember.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAddChatMember(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ roomId: "r-1", userId: "u-2" }).catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("メンバーの追加に失敗しました", {
        id: "chat-member-add-error",
      });
    });
  });

  describe("useRemoveChatMember: メンバー削除", () => {
    it("成功時に chatApi.removeMember + toast.success", async () => {
      apiMock.removeMember.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useRemoveChatMember(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ roomId: "r-1", userId: "u-2" });
      });

      expect(apiMock.removeMember).toHaveBeenCalledWith("r-1", "u-2");
      expect(toastMock.success).toHaveBeenCalledWith("メンバーを削除しました");
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.removeMember.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useRemoveChatMember(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ roomId: "r-1", userId: "u-2" }).catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("メンバーの削除に失敗しました", {
        id: "chat-member-remove-error",
      });
    });
  });

  describe("useMarkAsRead: 既読更新", () => {
    it("成功時に chat / notifications の invalidateQueries が呼ばれる（toast は出さない）", async () => {
      apiMock.markAsRead.mockResolvedValue(undefined);
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("r-1");
      });

      expect(apiMock.markAsRead).toHaveBeenCalledWith("r-1");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chat", "rooms"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications"] });
      expect(toastMock.success).not.toHaveBeenCalled();
    });
  });

  describe("useToggleMute: ミュート切替", () => {
    it("成功時に invalidateQueries が呼ばれ、isMuted を返す", async () => {
      apiMock.toggleMute.mockResolvedValue({ isMuted: true });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useToggleMute(), { wrapper });

      await act(async () => {
        const res = await result.current.mutateAsync("r-1");
        expect(res).toEqual({ isMuted: true });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chat", "rooms"] });
    });
  });
});
