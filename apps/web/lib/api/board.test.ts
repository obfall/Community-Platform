import { describe, it, expect, vi, beforeEach } from "vitest";

// apiClient をモック（vi.hoisted で vi.mock の hoisting に対応）
const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  apiClient: apiClientMock,
}));

import { createBoardApi } from "./board";

describe("createBoardApi: スコープ別 API クライアント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("global スコープ", () => {
    const api = createBoardApi({ kind: "global" });

    it("getCategories は GET /board/categories を呼ぶ", async () => {
      apiClientMock.get.mockResolvedValue({ data: [] });
      await api.getCategories();
      expect(apiClientMock.get).toHaveBeenCalledWith("/board/categories");
    });

    it("getTopics は params 付きで GET /board/topics を呼ぶ", async () => {
      apiClientMock.get.mockResolvedValue({ data: { data: [], meta: {} } });
      await api.getTopics({ categoryId: "cat-1", limit: 20 });
      expect(apiClientMock.get).toHaveBeenCalledWith("/board/topics", {
        params: { categoryId: "cat-1", limit: 20 },
      });
    });

    it("createTopic は POST /board/topics に dto を送る", async () => {
      apiClientMock.post.mockResolvedValue({ data: { id: "t-1" } });
      const dto = {
        title: "テスト",
        body: "本文",
        categoryId: "cat-1",
        publishStatus: "published" as const,
      };
      await api.createTopic(dto);
      expect(apiClientMock.post).toHaveBeenCalledWith("/board/topics", dto);
    });

    it("toggleTopicPin は PATCH /board/topics/:id/pin を呼ぶ", async () => {
      apiClientMock.patch.mockResolvedValue({ data: { isPinned: true } });
      await api.toggleTopicPin("t-1");
      expect(apiClientMock.patch).toHaveBeenCalledWith("/board/topics/t-1/pin");
    });

    it("deleteTopic は DELETE /board/topics/:id を呼ぶ", async () => {
      apiClientMock.delete.mockResolvedValue({});
      await api.deleteTopic("t-1");
      expect(apiClientMock.delete).toHaveBeenCalledWith("/board/topics/t-1");
    });

    it("toggleTopicLike は POST /board/topics/:id/like を呼ぶ", async () => {
      apiClientMock.post.mockResolvedValue({ data: { liked: true, likeCount: 1 } });
      await api.toggleTopicLike("t-1");
      expect(apiClientMock.post).toHaveBeenCalledWith("/board/topics/t-1/like");
    });
  });

  describe("project スコープ", () => {
    it("base path に /projects/:projectId/board が入る", async () => {
      const api = createBoardApi({ kind: "project", projectId: "p-1" });
      apiClientMock.get.mockResolvedValue({ data: [] });
      await api.getCategories();
      expect(apiClientMock.get).toHaveBeenCalledWith("/projects/p-1/board/categories");
    });
  });

  describe("event スコープ", () => {
    it("base path に /events/:eventId/board が入る", async () => {
      const api = createBoardApi({ kind: "event", eventId: "e-1" });
      apiClientMock.get.mockResolvedValue({ data: [] });
      await api.getCategories();
      expect(apiClientMock.get).toHaveBeenCalledWith("/events/e-1/board/categories");
    });
  });
});
