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

import { contentsApi } from "./content";

describe("contentsApi: コンテンツ API クライアント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAll は GET /contents を params 付きで呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: { data: [], meta: {} } });
    await contentsApi.getAll({ page: 1, limit: 12, search: "記事", contentType: "meal_drink" });
    expect(apiClientMock.get).toHaveBeenCalledWith("/contents", {
      params: { page: 1, limit: 12, search: "記事", contentType: "meal_drink" },
    });
  });

  it("getOne は GET /contents/:id を呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: { id: "c-1" } });
    await contentsApi.getOne("c-1");
    expect(apiClientMock.get).toHaveBeenCalledWith("/contents/c-1");
  });

  it("create は POST /contents に dto を送る", async () => {
    apiClientMock.post.mockResolvedValue({ data: { id: "c-1" } });
    const dto = { name: "新規コンテンツ", contentType: "meal_drink" as const };
    await contentsApi.create(dto);
    expect(apiClientMock.post).toHaveBeenCalledWith("/contents", dto);
  });

  it("update は PATCH /contents/:id に dto を送る", async () => {
    apiClientMock.patch.mockResolvedValue({ data: { id: "c-1" } });
    const dto = { name: "更新後" };
    await contentsApi.update("c-1", dto);
    expect(apiClientMock.patch).toHaveBeenCalledWith("/contents/c-1", dto);
  });

  it("remove は DELETE /contents/:id を呼ぶ", async () => {
    apiClientMock.delete.mockResolvedValue({});
    await contentsApi.remove("c-1");
    expect(apiClientMock.delete).toHaveBeenCalledWith("/contents/c-1");
  });
});
