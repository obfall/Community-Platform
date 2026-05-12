import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

// API クライアントモック（createBoardApi が返すオブジェクトの形を再現）
const apiMock = {
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: vi.fn(),
  getTopics: vi.fn(),
  getTopic: vi.fn(),
  createTopic: vi.fn(),
  updateTopic: vi.fn(),
  deleteTopic: vi.fn(),
  reorderTopics: vi.fn(),
  toggleTopicPin: vi.fn(),
  toggleTopicLike: vi.fn(),
  getTopicPosts: vi.fn(),
  createTopicPost: vi.fn(),
  updateTopicPost: vi.fn(),
  deleteTopicPost: vi.fn(),
  toggleTopicPostLike: vi.fn(),
  getTopicPostComments: vi.fn(),
  createTopicPostComment: vi.fn(),
  updateTopicPostComment: vi.fn(),
  deleteTopicPostComment: vi.fn(),
  toggleTopicPostCommentLike: vi.fn(),
};

vi.mock("@/lib/api/board", () => ({
  createBoardApi: () => apiMock,
}));

// BoardScope は global 固定で返す（Provider なしでも動かす）
vi.mock("@/components/board/board-scope", () => ({
  useBoardScope: () => ({ kind: "global" }),
  boardScopeKey: () => ["global"],
}));

// sonner toast モック
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  useCategories,
  useTopics,
  useTopicSearchCategoryHits,
  useCreateTopic,
  useDeleteTopic,
  useToggleTopicPin,
} from "./use-board";

describe("board hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCategories: カテゴリ一覧取得", () => {
    it("api.getCategories が呼ばれ、データが返る", async () => {
      apiMock.getCategories.mockResolvedValue([{ id: "cat-1", name: "お知らせ" }]);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCategories(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([{ id: "cat-1", name: "お知らせ" }]);
      expect(apiMock.getCategories).toHaveBeenCalled();
    });
  });

  describe("useTopics: トピック一覧取得", () => {
    it("api.getTopics が query 付きで呼ばれる", async () => {
      apiMock.getTopics.mockResolvedValue({ data: [], meta: {} });

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useTopics({ categoryId: "cat-1", limit: 20 }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getTopics).toHaveBeenCalledWith({ categoryId: "cat-1", limit: 20 });
    });

    it("options.enabled=false なら fetch されない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useTopics(undefined, { enabled: false }), { wrapper });

      await new Promise((r) => setTimeout(r, 50));
      expect(apiMock.getTopics).not.toHaveBeenCalled();
    });
  });

  describe("useTopicSearchCategoryHits: 検索集計", () => {
    it("search 未指定なら fetch されない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useTopicSearchCategoryHits(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 50));
      expect(apiMock.getTopics).not.toHaveBeenCalled();
    });

    it("search 指定で limit: 100 を渡して fetch する", async () => {
      apiMock.getTopics.mockResolvedValue({ data: [], meta: {} });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useTopicSearchCategoryHits("イベント"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getTopics).toHaveBeenCalledWith({ search: "イベント", limit: 100 });
    });
  });

  describe("useCreateTopic: トピック作成", () => {
    it("成功時に api.createTopic が呼ばれる", async () => {
      apiMock.createTopic.mockResolvedValue({ id: "t-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateTopic(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          title: "新規",
          body: "本文",
          categoryId: "cat-1",
          publishStatus: "published",
        });
      });

      expect(apiMock.createTopic).toHaveBeenCalledWith({
        title: "新規",
        body: "本文",
        categoryId: "cat-1",
        publishStatus: "published",
      });
    });
  });

  describe("useDeleteTopic: トピック削除", () => {
    it("成功時に api.deleteTopic が呼ばれる", async () => {
      apiMock.deleteTopic.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteTopic(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("t-1");
      });

      expect(apiMock.deleteTopic).toHaveBeenCalledWith("t-1");
    });
  });

  describe("useToggleTopicPin: ピン留めトグル", () => {
    it("成功時に api.toggleTopicPin が呼ばれ、isPinned を返す", async () => {
      apiMock.toggleTopicPin.mockResolvedValue({ isPinned: true });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useToggleTopicPin(), { wrapper });

      await act(async () => {
        const res = await result.current.mutateAsync("t-1");
        expect(res).toEqual({ isPinned: true });
      });

      expect(apiMock.toggleTopicPin).toHaveBeenCalledWith("t-1");
    });
  });
});
