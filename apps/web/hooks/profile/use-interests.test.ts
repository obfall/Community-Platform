import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/profile", () => ({
  profileApi: {
    getInterestCategories: vi.fn(),
    replaceInterests: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useInterestCategories, useReplaceInterests } from "./use-interests";
import { profileApi } from "@/lib/api/profile";
import { toast } from "sonner";

describe("興味分野 hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useInterestCategories: カテゴリ一覧取得", () => {
    it("profileApi.getInterestCategories が呼ばれ、データが返る", async () => {
      const categories = [
        { id: "c1", name: "技術", slug: "tech" },
        { id: "c2", name: "音楽", slug: "music" },
      ];
      vi.mocked(profileApi.getInterestCategories).mockResolvedValue(categories);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useInterestCategories(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(categories);
      expect(profileApi.getInterestCategories).toHaveBeenCalled();
    });
  });

  describe("useReplaceInterests: 興味分野一括設定", () => {
    it("成功時に成功トーストが出る", async () => {
      vi.mocked(profileApi.replaceInterests).mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useReplaceInterests(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(["c1", "c2"]);
      });

      expect(profileApi.replaceInterests).toHaveBeenCalledWith(["c1", "c2"]);
      expect(toast.success).toHaveBeenCalledWith("興味分野を更新しました");
    });

    it("失敗時は個別の error toast を出さない（グローバル QueryCache.onError に任せる）", async () => {
      vi.mocked(profileApi.replaceInterests).mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useReplaceInterests(), { wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync(["c1"])).rejects.toThrow();
      });
      // Phase 11.3 規約: 個別 hook で toast.error を呼ばないこと
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
