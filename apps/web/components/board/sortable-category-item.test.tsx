import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Accordion } from "@/components/ui/accordion";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/board/use-board", () => ({
  useUpdateCategory: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteCategory: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useTopics: vi.fn(() => ({ data: { data: [], meta: {} }, isLoading: false })),
  useReorderTopics: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteTopic: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleTopicPin: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ isAdmin: true, canEditAuthor: () => true })),
}));

import { SortableCategoryItem } from "./sortable-category-item";

const baseCategory = {
  id: "cat-1",
  name: "お知らせ",
  description: null,
  sortOrder: 0,
  allowTopicCreation: true,
  topicCount: 5,
  createdAt: "2026-01-01",
};

function renderInDnd(ui: React.ReactNode) {
  return renderWithProviders(
    <DndContext>
      <SortableContext items={[baseCategory.id]}>
        <Accordion type="multiple">{ui}</Accordion>
      </SortableContext>
    </DndContext>,
  );
}

describe("SortableCategoryItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("カテゴリ名と件数が表示される", () => {
    renderInDnd(
      <SortableCategoryItem
        category={baseCategory}
        canReorder
        canManage
        onCreateTopic={() => {}}
      />,
    );
    expect(screen.getByText("お知らせ")).toBeInTheDocument();
    expect(screen.getByText("(5)")).toBeInTheDocument();
  });

  it("canManage=true で 3 点リーダーのメニューが表示される", () => {
    renderInDnd(
      <SortableCategoryItem
        category={baseCategory}
        canReorder
        canManage
        onCreateTopic={() => {}}
      />,
    );
    // sr-only "メニューを開く" でメニュー Trigger を識別
    expect(screen.getByRole("button", { name: "メニューを開く" })).toBeInTheDocument();
  });
});
