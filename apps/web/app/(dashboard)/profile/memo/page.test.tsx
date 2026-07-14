import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/memo",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/memo/use-memo", () => ({
  useMemos: vi.fn(),
  useMemoCategories: vi.fn(),
  useCreateMemoCategory: vi.fn(),
}));

import MemoPage from "./page";
import { useMemos, useMemoCategories, useCreateMemoCategory } from "@/hooks/memo/use-memo";

function setHooks(opts: { memos?: unknown[]; isLoading?: boolean } = {}) {
  vi.mocked(useMemos).mockReturnValue({
    data: opts.memos,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useMemoCategories).mockReturnValue({ data: [] } as never);
  vi.mocked(useCreateMemoCategory).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
}

describe("MemoPage（一覧）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setHooks({ isLoading: true });
      renderWithProviders(<MemoPage />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("空状態", () => {
    it("メモ 0 件のとき『メモがありません』が表示される", () => {
      setHooks({ memos: [] });
      renderWithProviders(<MemoPage />);
      expect(screen.getByText("メモがありません")).toBeInTheDocument();
    });
  });

  describe("一覧表示", () => {
    it("メモの title が表示される", () => {
      setHooks({
        memos: [
          {
            id: "m1",
            title: "買い物リスト",
            body: "牛乳とパン",
            category: null,
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
      });
      renderWithProviders(<MemoPage />);
      expect(screen.getByText("買い物リスト")).toBeInTheDocument();
      expect(screen.getByText("牛乳とパン")).toBeInTheDocument();
    });
  });
});
