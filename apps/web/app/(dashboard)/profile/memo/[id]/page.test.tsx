import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/memo/use-memo", () => ({
  useMemoDetail: vi.fn(),
  useDeleteMemo: vi.fn(),
}));

import MemoDetailPage from "./page";
import { useMemoDetail, useDeleteMemo } from "@/hooks/memo/use-memo";

function setHooks(opts: { data?: object | undefined | null; isLoading?: boolean }) {
  vi.mocked(useMemoDetail).mockReturnValue({
    data: opts.data,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useDeleteMemo).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
}

/**
 * React 19 の use() に渡すための「即時解決済み Promise」を作る。
 * status / value を持つ thenable は use() が同期的に値を取り出す。
 */
function syncParams<T extends object>(value: T): Promise<T> {
  const p = Promise.resolve(value) as unknown as Promise<T> & { status: string; value: T };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

describe("MemoDetailPage（詳細）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ロード／未検出", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setHooks({ isLoading: true });
      renderWithProviders(<MemoDetailPage params={syncParams({ id: "m1" })} />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("メモ未検出時は『メモが見つかりません』が表示される", () => {
      setHooks({ data: null });
      renderWithProviders(<MemoDetailPage params={syncParams({ id: "m1" })} />);
      expect(screen.getByText("メモが見つかりません")).toBeInTheDocument();
    });
  });

  describe("詳細表示", () => {
    it("タイトル・本文と編集／削除ボタンが表示される", () => {
      setHooks({
        data: {
          id: "m1",
          title: "週次メモ",
          body: "議事録の内容",
          category: null,
          attachments: [],
        },
      });
      renderWithProviders(<MemoDetailPage params={syncParams({ id: "m1" })} />);
      expect(screen.getByText("週次メモ")).toBeInTheDocument();
      expect(screen.getByText("議事録の内容")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /編集/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
    });
  });
});
