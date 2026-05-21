import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

const { apiMock, toastMock } = vi.hoisted(() => ({
  apiMock: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getBookings: vi.fn(),
    getBooking: vi.fn(),
    createBooking: vi.fn(),
    updateBookingStatus: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/skills", () => ({
  skillsApi: apiMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  useSkills,
  useSkill,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  useSkillBookings,
  useSkillBooking,
  useCreateBooking,
  useUpdateBookingStatus,
  useSkillMessages,
  useSendSkillMessage,
  useSkillComments,
  useAddSkillComment,
  useDeleteSkillComment,
} from "./use-skills";

describe("skills hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useSkills: スキル一覧取得", () => {
    it("query 付きで skillsApi.getAll が呼ばれ、データが返る", async () => {
      const payload = { data: [{ id: "s-1", title: "Skill1" }], meta: { total: 1 } };
      apiMock.getAll.mockResolvedValue(payload);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useSkills({ page: 1, limit: 12 }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getAll).toHaveBeenCalledWith({ page: 1, limit: 12 });
      expect(result.current.data).toBe(payload);
    });
  });

  describe("useSkill: 単件取得", () => {
    it("id が指定されたとき getOne が呼ばれる", async () => {
      apiMock.getOne.mockResolvedValue({ id: "s-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useSkill("s-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getOne).toHaveBeenCalledWith("s-1");
    });

    it("id が undefined なら fetch されない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useSkill(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getOne).not.toHaveBeenCalled();
    });
  });

  describe("useCreateSkill: スキル出品", () => {
    it("成功時 create が呼ばれ、成功 toast が表示される", async () => {
      apiMock.create.mockResolvedValue({ id: "s-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateSkill(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ title: "新規", price: 1000, durationMinutes: 60 });
      });

      expect(apiMock.create).toHaveBeenCalledWith({
        title: "新規",
        price: 1000,
        durationMinutes: 60,
      });
      expect(toastMock.success).toHaveBeenCalled();
    });

    it("失敗時 mutation はエラーで reject する（エラートーストは providers.tsx に集約）", async () => {
      apiMock.create.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateSkill(), { wrapper });

      await act(async () => {
        await expect(
          result.current.mutateAsync({ title: "x", price: 1, durationMinutes: 1 }),
        ).rejects.toThrow();
      });

      expect(toastMock.success).not.toHaveBeenCalled();
      // toast.error は hook 内では呼ばない（MutationCache.onError で一元処理する規約）
      expect(toastMock.error).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateSkill: 更新", () => {
    it("update に id / data が渡され、成功 toast が表示される", async () => {
      apiMock.update.mockResolvedValue({ id: "s-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateSkill(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "s-1", data: { title: "更新後" } });
      });

      expect(apiMock.update).toHaveBeenCalledWith("s-1", { title: "更新後" });
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe("useDeleteSkill: 削除", () => {
    it("remove に id が渡され、成功 toast が表示される", async () => {
      apiMock.remove.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteSkill(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("s-1");
      });

      expect(apiMock.remove).toHaveBeenCalledWith("s-1");
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe("useSkillBookings: 予約一覧取得", () => {
    it("getBookings が呼ばれる", async () => {
      apiMock.getBookings.mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useSkillBookings(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getBookings).toHaveBeenCalled();
    });
  });

  describe("useSkillBooking: 予約単件取得 enabled 制御", () => {
    it("bookingId 未指定なら getBooking は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useSkillBooking(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getBooking).not.toHaveBeenCalled();
    });

    it("bookingId 指定で getBooking が呼ばれる", async () => {
      apiMock.getBooking.mockResolvedValue({ id: "b-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useSkillBooking("b-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getBooking).toHaveBeenCalledWith("b-1");
    });
  });

  describe("useCreateBooking: 予約リクエスト", () => {
    it("listingId と data を渡し、トーストは出さない（呼び出し側で表示）", async () => {
      apiMock.createBooking.mockResolvedValue({ id: "b-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateBooking(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          listingId: "s-1",
          data: { message: "よろしく", scheduledAt: "2026-06-01T10:00:00Z" },
        });
      });

      expect(apiMock.createBooking).toHaveBeenCalledWith("s-1", {
        message: "よろしく",
        scheduledAt: "2026-06-01T10:00:00Z",
      });
      expect(toastMock.success).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateBookingStatus: ステータス変更", () => {
    it("bookingId / status / comment を渡す", async () => {
      apiMock.updateBookingStatus.mockResolvedValue({ id: "b-1", status: "approved" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateBookingStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          bookingId: "b-1",
          status: "approved",
          comment: "OKです",
        });
      });

      expect(apiMock.updateBookingStatus).toHaveBeenCalledWith("b-1", "approved", "OKです");
    });
  });

  describe("useSkillMessages: メッセージ一覧 enabled 制御", () => {
    it("bookingId 未指定なら getMessages は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useSkillMessages(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getMessages).not.toHaveBeenCalled();
    });

    it("bookingId 指定で getMessages が呼ばれる", async () => {
      apiMock.getMessages.mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useSkillMessages("b-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getMessages).toHaveBeenCalledWith("b-1");
    });
  });

  describe("useSendSkillMessage: メッセージ送信", () => {
    it("bookingId / body を渡す", async () => {
      apiMock.sendMessage.mockResolvedValue({ id: "m-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useSendSkillMessage(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ bookingId: "b-1", body: "こんにちは" });
      });

      expect(apiMock.sendMessage).toHaveBeenCalledWith("b-1", "こんにちは");
    });
  });

  describe("useSkillComments: コメント一覧 enabled 制御", () => {
    it("listingId 未指定なら getComments は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useSkillComments(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getComments).not.toHaveBeenCalled();
    });

    it("listingId 指定で getComments が呼ばれる", async () => {
      apiMock.getComments.mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useSkillComments("s-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getComments).toHaveBeenCalledWith("s-1");
    });
  });

  describe("useAddSkillComment: コメント投稿", () => {
    it("listingId / body を渡し、成功 toast が表示される", async () => {
      apiMock.addComment.mockResolvedValue({ id: "c-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAddSkillComment(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ listingId: "s-1", body: "質問です" });
      });

      expect(apiMock.addComment).toHaveBeenCalledWith("s-1", "質問です");
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  describe("useDeleteSkillComment: コメント削除", () => {
    it("commentId を渡し、成功 toast が表示される", async () => {
      apiMock.deleteComment.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteSkillComment(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("c-1");
      });

      expect(apiMock.deleteComment).toHaveBeenCalledWith("c-1");
      expect(toastMock.success).toHaveBeenCalled();
    });
  });
});
