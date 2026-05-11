import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

// API クライアントのモック（パスを書き換え）
vi.mock("@/lib/api/members", () => ({
  usersApi: {
    getUsers: vi.fn(),
    getUser: vi.fn(),
    getUserEvents: vi.fn(),
    getUserProjects: vi.fn(),
  },
}));

vi.mock("@/lib/api/chat", () => ({
  chatApi: {
    createRoom: vi.fn(),
  },
}));

// useRouter のモック
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// sonner toast のモック
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import {
  useMembers,
  useMember,
  useMemberEvents,
  useMemberProjects,
  useStartDm,
} from "./use-members";
import { usersApi } from "@/lib/api/members";
import { chatApi } from "@/lib/api/chat";

describe("members hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useMembers: 一覧取得", () => {
    it("usersApi.getUsers が呼ばれ、データが返る", async () => {
      const mockData = {
        data: [
          {
            id: "1",
            name: "test",
            email: "t@e.com",
            role: "member",
            status: "active",
            avatarUrl: null,
            createdAt: "",
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      vi.mocked(usersApi.getUsers).mockResolvedValue(mockData);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMembers({ page: 1 }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(usersApi.getUsers).toHaveBeenCalledWith({ page: 1 });
    });
  });

  describe("useMember: 詳細取得", () => {
    it("id が undefined のときは fetch されない（enabled: false）", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useMember(undefined), { wrapper });

      // 少し待ってもクエリが発火しないこと
      await new Promise((r) => setTimeout(r, 50));
      expect(usersApi.getUser).not.toHaveBeenCalled();
    });

    it("id があれば fetch される", async () => {
      vi.mocked(usersApi.getUser).mockResolvedValue({ id: "u1" } as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMember("u1"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(usersApi.getUser).toHaveBeenCalledWith("u1");
    });
  });

  describe("useMemberEvents / useMemberProjects: enabled 制御", () => {
    it("どちらも id 未指定で fetch されない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useMemberEvents(undefined), { wrapper });
      renderHook(() => useMemberProjects(undefined), { wrapper });
      await new Promise((r) => setTimeout(r, 50));
      expect(usersApi.getUserEvents).not.toHaveBeenCalled();
      expect(usersApi.getUserProjects).not.toHaveBeenCalled();
    });

    it("id ありなら getUserEvents が呼ばれる", async () => {
      vi.mocked(usersApi.getUserEvents).mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMemberEvents("u1"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(usersApi.getUserEvents).toHaveBeenCalledWith("u1");
    });
  });

  describe("useStartDm: DM 開始", () => {
    it("成功時に /chat?room=<id> へ遷移する", async () => {
      vi.mocked(chatApi.createRoom).mockResolvedValue({ id: "room1" } as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useStartDm(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("targetUserId");
      });

      expect(chatApi.createRoom).toHaveBeenCalledWith({ type: "dm", memberIds: ["targetUserId"] });
      expect(pushMock).toHaveBeenCalledWith("/chat?room=room1");
    });

    it("失敗時は遷移しない（onError でトースト表示）", async () => {
      vi.mocked(chatApi.createRoom).mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useStartDm(), { wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync("targetUserId")).rejects.toThrow();
      });
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
