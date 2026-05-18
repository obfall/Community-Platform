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

import { albumsApi } from "./albums";

describe("albumsApi: アルバム API クライアント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAll は GET /albums を params 付きで呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: { data: [], meta: {} } });
    await albumsApi.getAll({ page: 1, limit: 12, search: "夏", categoryId: "c-1" });
    expect(apiClientMock.get).toHaveBeenCalledWith("/albums", {
      params: { page: 1, limit: 12, search: "夏", categoryId: "c-1" },
    });
  });

  it("getOne は GET /albums/:id を呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: { id: "a-1" } });
    await albumsApi.getOne("a-1");
    expect(apiClientMock.get).toHaveBeenCalledWith("/albums/a-1");
  });

  it("create は POST /albums に dto を送る", async () => {
    apiClientMock.post.mockResolvedValue({ data: { id: "a-1" } });
    const dto = { title: "夏のアルバム", description: "desc" };
    await albumsApi.create(dto);
    expect(apiClientMock.post).toHaveBeenCalledWith("/albums", dto);
  });

  it("update は PATCH /albums/:id に dto を送る", async () => {
    apiClientMock.patch.mockResolvedValue({ data: { id: "a-1" } });
    const dto = { title: "更新後" };
    await albumsApi.update("a-1", dto);
    expect(apiClientMock.patch).toHaveBeenCalledWith("/albums/a-1", dto);
  });

  it("remove は DELETE /albums/:id を呼ぶ", async () => {
    apiClientMock.delete.mockResolvedValue({});
    await albumsApi.remove("a-1");
    expect(apiClientMock.delete).toHaveBeenCalledWith("/albums/a-1");
  });

  it("addPhotos は POST /albums/:id/photos に { photos } を送る", async () => {
    apiClientMock.post.mockResolvedValue({ data: { count: 1 } });
    const photos = [{ fileId: "f-1", title: "夕焼け" }];
    await albumsApi.addPhotos("a-1", photos);
    expect(apiClientMock.post).toHaveBeenCalledWith("/albums/a-1/photos", { photos });
  });

  it("removePhoto は DELETE /albums/:albumId/photos/:photoId を呼ぶ", async () => {
    apiClientMock.delete.mockResolvedValue({});
    await albumsApi.removePhoto("a-1", "p-1");
    expect(apiClientMock.delete).toHaveBeenCalledWith("/albums/a-1/photos/p-1");
  });

  it("getCategories は GET /albums/categories を呼ぶ", async () => {
    apiClientMock.get.mockResolvedValue({ data: [] });
    await albumsApi.getCategories();
    expect(apiClientMock.get).toHaveBeenCalledWith("/albums/categories");
  });

  it("createCategory は POST /albums/categories に { name } を送る", async () => {
    apiClientMock.post.mockResolvedValue({ data: { id: "c-1", name: "風景" } });
    await albumsApi.createCategory("風景");
    expect(apiClientMock.post).toHaveBeenCalledWith("/albums/categories", { name: "風景" });
  });
});
