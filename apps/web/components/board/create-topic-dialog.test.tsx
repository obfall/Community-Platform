import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/board/use-board", () => ({
  useCategories: vi.fn(() => ({
    data: [{ id: "cat-1", name: "お知らせ" }],
  })),
  useCreateTopic: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { CreateTopicDialog } from "./create-topic-dialog";

describe("CreateTopicDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("open=true でダイアログとフォーム要素が表示される", () => {
    renderWithProviders(<CreateTopicDialog open onOpenChange={() => {}} />);
    // ダイアログタイトル
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // 主要フォームラベル
    expect(screen.getByText("カテゴリ")).toBeInTheDocument();
    expect(screen.getByText("タイトル")).toBeInTheDocument();
    expect(screen.getByText("本文")).toBeInTheDocument();
  });

  it("送信ボタン「トピックを作成」が表示される", () => {
    renderWithProviders(<CreateTopicDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "トピックを作成" })).toBeInTheDocument();
  });
});
