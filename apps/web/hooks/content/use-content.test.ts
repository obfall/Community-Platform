import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

// contentsApi / sonner をモック（vi.hoisted で hoisting に対応）
const { apiMock, toastMock } = vi.hoisted(() => ({
  apiMock: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/content", () => ({
  contentsApi: apiMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  useContents,
  useContent,
  useCreateContent,
  useUpdateContent,
  useDeleteContent,
} from "./use-content";

describe("contents hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useContents: 一覧取得", () => {
    it("contentsApi.getAll を query で呼んでデータを返す", async () => {
      apiMock.getAll.mockResolvedValue({ data: [{ id: "c-1" }], meta: {} });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useContents({ page: 1 }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getAll).toHaveBeenCalledWith({ page: 1 });
      expect(result.current.data).toEqual({ data: [{ id: "c-1" }], meta: {} });
    });
  });

  describe("useContent: 詳細取得", () => {
    it("id が undefined なら fetch しない", async () => {
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useContent(undefined), { wrapper });
      await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
      expect(apiMock.getOne).not.toHaveBeenCalled();
    });

    it("id 指定で contentsApi.getOne を呼ぶ", async () => {
      apiMock.getOne.mockResolvedValue({ id: "c-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useContent("c-1"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getOne).toHaveBeenCalledWith("c-1");
    });
  });

  describe("useCreateContent: 作成", () => {
    it("成功時に toast.success と invalidateQueries が呼ばれる", async () => {
      apiMock.create.mockResolvedValue({ id: "c-1" });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useCreateContent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: "新規", contentType: "meal_drink" });
      });

      expect(apiMock.create).toHaveBeenCalledWith({ name: "新規", contentType: "meal_drink" });
      expect(toastMock.success).toHaveBeenCalledWith("コンテンツを作成しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contents"] });
    });

    it("失敗時は個別 toast.error を呼ばずグローバルハンドラに委譲する", async () => {
      apiMock.create.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateContent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: "x", contentType: "meal_drink" }).catch(() => {});
      });

      expect(toastMock.error).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateContent: 更新", () => {
    it("成功時に toast.success と invalidateQueries（一覧 + 詳細）が呼ばれる", async () => {
      apiMock.update.mockResolvedValue({ id: "c-1" });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useUpdateContent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "c-1", data: { name: "new" } });
      });

      expect(apiMock.update).toHaveBeenCalledWith("c-1", { name: "new" });
      expect(toastMock.success).toHaveBeenCalledWith("コンテンツを更新しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contents"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contents", "c-1"] });
    });

    it("失敗時は個別 toast.error を呼ばずグローバルハンドラに委譲する", async () => {
      apiMock.update.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateContent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "c-1", data: { name: "x" } }).catch(() => {});
      });

      expect(toastMock.error).not.toHaveBeenCalled();
    });
  });

  describe("useDeleteContent: 削除", () => {
    it("成功時に toast.success と invalidateQueries が呼ばれる", async () => {
      apiMock.remove.mockResolvedValue(undefined);
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useDeleteContent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("c-1");
      });

      expect(apiMock.remove).toHaveBeenCalledWith("c-1");
      expect(toastMock.success).toHaveBeenCalledWith("コンテンツを削除しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contents"] });
    });

    it("失敗時は個別 toast.error を呼ばずグローバルハンドラに委譲する", async () => {
      apiMock.remove.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteContent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("c-1").catch(() => {});
      });

      expect(toastMock.error).not.toHaveBeenCalled();
    });
  });
});
