import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// Radix UI（DropdownMenu）が参照する API は jsdom 未実装のため polyfill する
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

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
    const sampleMemo = {
      id: "m1",
      title: "週次メモ",
      body: "議事録の内容",
      category: null,
      attachments: [],
    };

    function openMenu() {
      const trigger = screen
        .getAllByRole("button")
        .find((b) => b.getAttribute("aria-haspopup") === "menu");
      return userEvent.click(trigger!);
    }

    it("タイトル・本文が表示される", () => {
      setHooks({ data: sampleMemo });
      renderWithProviders(<MemoDetailPage params={syncParams({ id: "m1" })} />);
      expect(screen.getByText("週次メモ")).toBeInTheDocument();
      expect(screen.getByText("議事録の内容")).toBeInTheDocument();
    });

    it("三点メニューを開くと『編集』『削除』項目が表示される", async () => {
      setHooks({ data: sampleMemo });
      renderWithProviders(<MemoDetailPage params={syncParams({ id: "m1" })} />);
      await openMenu();
      expect(screen.getByRole("menuitem", { name: /編集/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /削除/ })).toBeInTheDocument();
    });

    it("編集リンクが /profile/memo/{id}/edit を指す（404 回帰防止）", async () => {
      setHooks({ data: sampleMemo });
      renderWithProviders(<MemoDetailPage params={syncParams({ id: "m1" })} />);
      await openMenu();
      expect(screen.getByRole("menuitem", { name: /編集/ })).toHaveAttribute(
        "href",
        "/profile/memo/m1/edit",
      );
    });
  });
});
