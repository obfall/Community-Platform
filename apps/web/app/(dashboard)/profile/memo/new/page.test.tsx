import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/memo/use-memo", () => ({
  useCreateMemo: vi.fn(),
  useMemoCategories: vi.fn(),
}));

vi.mock("@/components/file-upload-list", () => ({
  FileUploadList: () => <div data-testid="file-upload-list" />,
}));

import MemoNewPage from "./page";
import { useCreateMemo, useMemoCategories } from "@/hooks/memo/use-memo";

function setHooks(opts: { isPending?: boolean } = {}) {
  vi.mocked(useCreateMemo).mockReturnValue({
    mutate: vi.fn(),
    isPending: opts.isPending ?? false,
  } as never);
  vi.mocked(useMemoCategories).mockReturnValue({ data: [] } as never);
}

describe("MemoNewPage（作成）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHooks();
  });

  describe("表示", () => {
    it("見出し『メモ作成』とフォーム項目が表示される", () => {
      renderWithProviders(<MemoNewPage />);
      expect(screen.getByText("メモ作成")).toBeInTheDocument();
      expect(screen.getByText("基本情報")).toBeInTheDocument();
      expect(screen.getByText("タイトル")).toBeInTheDocument();
      expect(screen.getByText("本文")).toBeInTheDocument();
    });

    it("送信ボタンに『作成』、キャンセルに『キャンセル』が表示される", () => {
      renderWithProviders(<MemoNewPage />);
      expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
      expect(screen.getByText("キャンセル")).toBeInTheDocument();
    });
  });

  describe("送信ボタンの活性", () => {
    it("タイトル未入力では送信ボタンが disabled になる", () => {
      renderWithProviders(<MemoNewPage />);
      expect(screen.getByRole("button", { name: "作成" })).toBeDisabled();
    });
  });
});
