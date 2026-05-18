import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

// albumsApi / sonner をモック（vi.hoisted で hoisting に対応）
const { apiMock, toastMock } = vi.hoisted(() => ({
  apiMock: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addPhotos: vi.fn(),
    removePhoto: vi.fn(),
    getCategories: vi.fn(),
    createCategory: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/albums", () => ({
  albumsApi: apiMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  useAlbums,
  useAlbum,
  useCreateAlbum,
  useUpdateAlbum,
  useDeleteAlbum,
  useAddAlbumPhotos,
  useRemoveAlbumPhoto,
  useAlbumCategories,
  useCreateAlbumCategory,
} from "./use-albums";

describe("albums hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useAlbums: 一覧取得", () => {
    it("albumsApi.getAll を query で呼んでデータを返す", async () => {
      apiMock.getAll.mockResolvedValue({ data: [{ id: "a-1" }], meta: {} });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAlbums({ page: 1 }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getAll).toHaveBeenCalledWith({ page: 1 });
      expect(result.current.data).toEqual({ data: [{ id: "a-1" }], meta: {} });
    });
  });

  describe("useAlbum: 詳細取得", () => {
    it("id が undefined なら fetch しない", async () => {
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAlbum(undefined), { wrapper });
      await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
      expect(apiMock.getOne).not.toHaveBeenCalled();
    });

    it("id 指定で albumsApi.getOne を呼ぶ", async () => {
      apiMock.getOne.mockResolvedValue({ id: "a-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAlbum("a-1"), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getOne).toHaveBeenCalledWith("a-1");
    });
  });

  describe("useCreateAlbum: 作成", () => {
    it("成功時に toast.success と invalidateQueries が呼ばれる", async () => {
      apiMock.create.mockResolvedValue({ id: "a-1" });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useCreateAlbum(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ title: "新規" } as never);
      });

      expect(apiMock.create).toHaveBeenCalledWith({ title: "新規" });
      expect(toastMock.success).toHaveBeenCalledWith("アルバムを作成しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.create.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateAlbum(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ title: "x" } as never).catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("アルバム作成に失敗しました", {
        id: "album-create-error",
      });
    });
  });

  describe("useUpdateAlbum: 更新", () => {
    it("成功時に toast.success と invalidateQueries（一覧 + 詳細）が呼ばれる", async () => {
      apiMock.update.mockResolvedValue({ id: "a-1" });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useUpdateAlbum(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "a-1", data: { title: "new" } });
      });

      expect(apiMock.update).toHaveBeenCalledWith("a-1", { title: "new" });
      expect(toastMock.success).toHaveBeenCalledWith("アルバムを更新しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums", "a-1"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.update.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateAlbum(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "a-1", data: { title: "x" } }).catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("アルバム更新に失敗しました", {
        id: "album-update-error",
      });
    });
  });

  describe("useDeleteAlbum: 削除", () => {
    it("成功時に toast.success と invalidateQueries が呼ばれる", async () => {
      apiMock.remove.mockResolvedValue(undefined);
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useDeleteAlbum(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("a-1");
      });

      expect(apiMock.remove).toHaveBeenCalledWith("a-1");
      expect(toastMock.success).toHaveBeenCalledWith("アルバムを削除しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.remove.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteAlbum(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("a-1").catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("アルバム削除に失敗しました", {
        id: "album-delete-error",
      });
    });
  });

  describe("useAddAlbumPhotos: 写真追加", () => {
    it("成功時に albumsApi.addPhotos + toast.success + invalidate（一覧 + 詳細）", async () => {
      apiMock.addPhotos.mockResolvedValue({ count: 2 });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useAddAlbumPhotos(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          albumId: "a-1",
          photos: [{ fileId: "f-1" }],
        });
      });

      expect(apiMock.addPhotos).toHaveBeenCalledWith("a-1", [{ fileId: "f-1" }]);
      expect(toastMock.success).toHaveBeenCalledWith("写真を追加しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums", "a-1"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.addPhotos.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAddAlbumPhotos(), { wrapper });

      await act(async () => {
        await result.current
          .mutateAsync({ albumId: "a-1", photos: [{ fileId: "f-1" }] })
          .catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("写真の追加に失敗しました", {
        id: "album-photos-add-error",
      });
    });
  });

  describe("useRemoveAlbumPhoto: 写真削除", () => {
    it("成功時に albumsApi.removePhoto + toast.success + invalidate（詳細）", async () => {
      apiMock.removePhoto.mockResolvedValue(undefined);
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useRemoveAlbumPhoto(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ albumId: "a-1", photoId: "p-1" });
      });

      expect(apiMock.removePhoto).toHaveBeenCalledWith("a-1", "p-1");
      expect(toastMock.success).toHaveBeenCalledWith("写真を削除しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums", "a-1"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.removePhoto.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useRemoveAlbumPhoto(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ albumId: "a-1", photoId: "p-1" }).catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("写真の削除に失敗しました", {
        id: "album-photo-remove-error",
      });
    });
  });

  describe("useAlbumCategories: カテゴリ一覧", () => {
    it("albumsApi.getCategories を呼んでデータを返す", async () => {
      apiMock.getCategories.mockResolvedValue([{ id: "c-1", name: "風景" }]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useAlbumCategories(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getCategories).toHaveBeenCalled();
      expect(result.current.data).toEqual([{ id: "c-1", name: "風景" }]);
    });
  });

  describe("useCreateAlbumCategory: カテゴリ作成", () => {
    it("成功時に toast.success と invalidate（categories）", async () => {
      apiMock.createCategory.mockResolvedValue({ id: "c-1", name: "風景" });
      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useCreateAlbumCategory(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("風景");
      });

      expect(apiMock.createCategory).toHaveBeenCalledWith("風景");
      expect(toastMock.success).toHaveBeenCalledWith("カテゴリを作成しました");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["albums", "categories"] });
    });

    it("失敗時に toast.error が固定 id 付きで呼ばれる", async () => {
      apiMock.createCategory.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateAlbumCategory(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("風景").catch(() => {});
      });

      expect(toastMock.error).toHaveBeenCalledWith("カテゴリ作成に失敗しました", {
        id: "album-category-create-error",
      });
    });
  });
});
