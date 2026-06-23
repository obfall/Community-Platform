import { describe, it, expect, vi, beforeAll } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// Radix UI の Select は ResizeObserver を参照するが jsdom には未実装のため polyfill する
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// next/navigation の最低限の mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/library",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/profile/use-library", () => ({
  useMyLibrary: vi.fn(),
  useCreateLibraryItem: vi.fn(),
  useUpdateLibraryItem: vi.fn(),
  useDeleteLibraryItem: vi.fn(),
}));

import ProfileLibraryPage from "./page";
import {
  useMyLibrary,
  useCreateLibraryItem,
  useUpdateLibraryItem,
  useDeleteLibraryItem,
} from "@/hooks/profile/use-library";

function setupMocks(
  opts: {
    isLoading?: boolean;
    items?: unknown;
  } = {},
) {
  vi.mocked(useMyLibrary).mockReturnValue({
    data: opts.items,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useCreateLibraryItem).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  } as never);
  vi.mocked(useUpdateLibraryItem).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  } as never);
  vi.mocked(useDeleteLibraryItem).mockReturnValue({
    mutate: vi.fn(),
  } as never);
}

const sampleItem = {
  id: "item-1",
  type: "book",
  title: "テスト駆動開発",
  content: null,
  author: "Kent Beck",
  publishedAt: "2017-10-01T00:00:00Z",
  pageCount: 344,
  impression: "良書",
  status: "completed",
};

describe("ProfileLibraryPage（マイライブラリー）", () => {
  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setupMocks({ isLoading: true });
      renderWithProviders(<ProfileLibraryPage />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("空状態", () => {
    it("アイテム 0 件のとき『ライブラリーにアイテムはありません』が表示される", () => {
      setupMocks({ items: [] });
      renderWithProviders(<ProfileLibraryPage />);
      expect(screen.getByText("ライブラリーにアイテムはありません")).toBeInTheDocument();
    });
  });

  describe("一覧表示", () => {
    it("アイテムのタイトル・タイプ/ステータスラベル・著者が表示される", () => {
      setupMocks({ items: [sampleItem] });
      renderWithProviders(<ProfileLibraryPage />);
      expect(screen.getByText("テスト駆動開発")).toBeInTheDocument();
      // typeLabels.book = 「書籍」
      expect(screen.getByText("書籍")).toBeInTheDocument();
      // statusLabels.completed = 「完読」
      expect(screen.getByText("完読")).toBeInTheDocument();
      // authorPrefix = 「著者: Kent Beck」
      expect(screen.getByText("著者: Kent Beck")).toBeInTheDocument();
    });
  });

  describe("追加ダイアログ", () => {
    it("『追加』ボタンを押すと作成用ダイアログのタイトルが表示される", async () => {
      setupMocks({ items: [] });
      renderWithProviders(<ProfileLibraryPage />);

      // ヘッダーの追加ボタン（複数の「追加」があるため最初のものを押下）
      await userEvent.click(screen.getAllByRole("button", { name: "追加" })[0]!);

      expect(screen.getByText("ライブラリーに追加")).toBeInTheDocument();
    });
  });
});
