import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/memo/use-memo", () => ({
  useMemoDetail: vi.fn(),
  useUpdateMemo: vi.fn(),
  useMemoCategories: vi.fn(),
}));

vi.mock("@/components/file-upload-list", () => ({
  FileUploadList: () => <div data-testid="file-upload-list" />,
}));

import MemoEditPage from "./page";
import { useMemoDetail, useUpdateMemo, useMemoCategories } from "@/hooks/memo/use-memo";

function setHooks(opts: { data?: object | undefined | null; isLoading?: boolean }) {
  vi.mocked(useMemoDetail).mockReturnValue({
    data: opts.data,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useUpdateMemo).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useMemoCategories).mockReturnValue({ data: [] } as never);
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

const baseMemo = {
  id: "m1",
  title: "編集前タイトル",
  body: "編集前本文",
  category: null,
  attachments: [],
};

describe("MemoEditPage（編集）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ロード／未検出", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setHooks({ isLoading: true });
      renderWithProviders(<MemoEditPage params={syncParams({ id: "m1" })} />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("メモ未検出時は『メモが見つかりません』が表示される", () => {
      setHooks({ data: null });
      renderWithProviders(<MemoEditPage params={syncParams({ id: "m1" })} />);
      expect(screen.getByText("メモが見つかりません")).toBeInTheDocument();
    });
  });

  describe("編集フォーム", () => {
    it("見出し『メモ編集』と既存値で初期化されたフォームが表示される", () => {
      setHooks({ data: baseMemo });
      renderWithProviders(<MemoEditPage params={syncParams({ id: "m1" })} />);
      expect(screen.getByText("メモ編集")).toBeInTheDocument();
      expect(screen.getByDisplayValue("編集前タイトル")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "更新" })).toBeInTheDocument();
    });
  });
});
