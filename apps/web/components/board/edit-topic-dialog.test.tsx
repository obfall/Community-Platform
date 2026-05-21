import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/board/use-board", () => ({
  useCategories: vi.fn(),
  useTopic: vi.fn(),
  useUpdateTopic: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { EditTopicDialog } from "./edit-topic-dialog";
import { useCategories, useTopic } from "@/hooks/board/use-board";

// 同一参照を維持するためモジュールスコープで定数化
const TOPIC_DATA = {
  id: "t-1",
  title: "既存タイトル",
  body: "既存本文",
  category: { id: "cat-1", name: "お知らせ" },
};
const CATEGORIES_DATA = [{ id: "cat-1", name: "お知らせ" }];

describe("EditTopicDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCategories).mockReturnValue({ data: CATEGORIES_DATA } as never);
    vi.mocked(useTopic).mockReturnValue({ data: TOPIC_DATA } as never);
  });

  it("open=true で『トピックを編集』タイトルが表示される", () => {
    renderWithProviders(<EditTopicDialog open onOpenChange={() => {}} topicId="t-1" />);
    expect(screen.getByText("トピックを編集")).toBeInTheDocument();
  });

  it("既存トピックの title / body がフォームに反映される", () => {
    renderWithProviders(<EditTopicDialog open onOpenChange={() => {}} topicId="t-1" />);
    expect(screen.getByDisplayValue("既存タイトル")).toBeInTheDocument();
    expect(screen.getByDisplayValue("既存本文")).toBeInTheDocument();
  });
});
