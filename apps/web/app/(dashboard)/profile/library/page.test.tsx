import { describe, it, expect, vi, beforeAll } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// Radix UI（Select / DropdownMenu）が参照する API は jsdom 未実装のため polyfill する
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

// 添付ファイルのアップロード経路（FileUploadList → filesApi.upload）を mock 化する
vi.mock("@/lib/api/files", () => ({
  filesApi: { upload: vi.fn() },
}));

import ProfileLibraryPage from "./page";
import {
  useMyLibrary,
  useCreateLibraryItem,
  useUpdateLibraryItem,
  useDeleteLibraryItem,
} from "@/hooks/profile/use-library";
import { filesApi } from "@/lib/api/files";

function setupMocks(
  opts: {
    isLoading?: boolean;
    items?: unknown;
  } = {},
) {
  const createAsync = vi.fn().mockResolvedValue(undefined);
  const updateAsync = vi.fn().mockResolvedValue(undefined);
  const deleteMutate = vi.fn();
  vi.mocked(useMyLibrary).mockReturnValue({
    data: opts.items,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useCreateLibraryItem).mockReturnValue({
    mutateAsync: createAsync,
    isPending: false,
  } as never);
  vi.mocked(useUpdateLibraryItem).mockReturnValue({
    mutateAsync: updateAsync,
    isPending: false,
  } as never);
  vi.mocked(useDeleteLibraryItem).mockReturnValue({
    mutate: deleteMutate,
  } as never);
  return { createAsync, updateAsync, deleteMutate };
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
  fileId: null,
  file: null,
};

const itemWithFile = {
  ...sampleItem,
  id: "item-2",
  title: "添付あり書籍",
  fileId: "file-1",
  file: { id: "file-1", originalName: "資料.pdf", publicUrl: "https://example.com/shiryo.pdf" },
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

  describe("添付ファイルの一覧表示", () => {
    it("file がある場合、添付ファイル名のリンク（別タブ・publicUrl）が表示される", () => {
      setupMocks({ items: [itemWithFile] });
      renderWithProviders(<ProfileLibraryPage />);

      const link = screen.getByRole("link", { name: "資料.pdf" });
      expect(link).toHaveAttribute("href", "https://example.com/shiryo.pdf");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("file が null の場合、添付ファイルのリンクは表示されない", () => {
      setupMocks({ items: [sampleItem] });
      renderWithProviders(<ProfileLibraryPage />);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("三点メニュー（編集・削除）", () => {
    function openMenu() {
      const trigger = screen
        .getAllByRole("button")
        .find((b) => b.getAttribute("aria-haspopup") === "menu");
      return userEvent.click(trigger!);
    }

    it("メニューを開くと『編集』『削除』項目が表示される", async () => {
      setupMocks({ items: [sampleItem] });
      renderWithProviders(<ProfileLibraryPage />);

      await openMenu();

      expect(screen.getByRole("menuitem", { name: "編集" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "削除" })).toBeInTheDocument();
    });

    it("『削除』を押すと削除確認ダイアログが表示される", async () => {
      setupMocks({ items: [sampleItem] });
      renderWithProviders(<ProfileLibraryPage />);

      await openMenu();
      await userEvent.click(screen.getByRole("menuitem", { name: "削除" }));

      // library.deleteConfirm.title
      expect(screen.getByText("削除の確認")).toBeInTheDocument();
    });
  });

  describe("添付ファイルのアップロード", () => {
    it("追加ダイアログでファイルをアップロードすると添付ファイルの表示に切り替わる", async () => {
      vi.mocked(filesApi.upload).mockResolvedValue({
        id: "file-9",
        publicUrl: "https://example.com/ronbun.pdf",
        originalName: "論文.pdf",
        contentType: "application/pdf",
      } as never);
      setupMocks({ items: [] });
      renderWithProviders(<ProfileLibraryPage />);

      await userEvent.click(screen.getAllByRole("button", { name: "追加" })[0]!);

      // Dialog はポータル描画のため document から file input を取得する
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["dummy"], "論文.pdf", { type: "application/pdf" });
      await userEvent.upload(input, file);

      // アップロード後はファイル名リンクが表示され、追加 UI（ファイルを追加ボタン）は消える
      expect(await screen.findByRole("link", { name: "論文.pdf" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "ファイルを追加" })).not.toBeInTheDocument();
      expect(filesApi.upload).toHaveBeenCalledTimes(1);
    });
  });
});
