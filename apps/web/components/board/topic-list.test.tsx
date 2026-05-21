import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/board/use-board", () => ({
  useTopics: vi.fn(),
  useReorderTopics: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteTopic: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleTopicPin: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ isAdmin: false, canEditAuthor: () => false })),
}));

vi.mock("./board-scope", () => ({
  useBoardPaths: () => ({ topic: (id: string) => `/board/topics/${id}` }),
}));

vi.mock("./edit-topic-dialog", () => ({
  EditTopicDialog: () => null,
}));

import { TopicList } from "./topic-list";
import { useTopics } from "@/hooks/board/use-board";
import type { BoardTopic } from "@/lib/api/types";

const baseTopic: BoardTopic = {
  id: "t-1",
  title: "テスト",
  body: "本文",
  isPinned: false,
  sortOrder: 0,
  postCount: 2,
  likeCount: 3,
  author: { id: "u-1", name: "太郎", avatarUrl: null },
  category: { id: "cat-1", name: "雑談" },
  isLiked: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("TopicList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetch モード（presetTopics なし）", () => {
    it("useTopics で fetch し、結果を描画する", () => {
      vi.mocked(useTopics).mockReturnValue({
        data: { data: [baseTopic], meta: {} },
        isLoading: false,
      } as never);
      renderWithProviders(<TopicList categoryId="cat-1" />);
      expect(screen.getByText("テスト")).toBeInTheDocument();
      expect(useTopics).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: "cat-1" }),
        expect.objectContaining({ enabled: true }),
      );
    });

    it("data 0 件なら空状態メッセージ", () => {
      vi.mocked(useTopics).mockReturnValue({
        data: { data: [], meta: {} },
        isLoading: false,
      } as never);
      renderWithProviders(<TopicList categoryId="cat-1" />);
      expect(screen.getByText("トピックはまだありません")).toBeInTheDocument();
    });

    it("ロード中はスケルトン要素が描画される", () => {
      vi.mocked(useTopics).mockReturnValue({ data: undefined, isLoading: true } as never);
      const { container } = renderWithProviders(<TopicList categoryId="cat-1" />);
      // animate-pulse のスケルトン div が出る
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });
  });

  describe("presetTopics モード（親から渡される）", () => {
    it("useTopics は fetch しない（enabled: false）", () => {
      vi.mocked(useTopics).mockReturnValue({ data: undefined, isLoading: false } as never);
      renderWithProviders(<TopicList categoryId="cat-1" topics={[baseTopic]} />);
      expect(useTopics).toHaveBeenCalledWith(undefined, { enabled: false });
    });

    it("presetTopics を直接描画する", () => {
      vi.mocked(useTopics).mockReturnValue({ data: undefined, isLoading: false } as never);
      renderWithProviders(<TopicList categoryId="cat-1" topics={[baseTopic]} />);
      expect(screen.getByText("テスト")).toBeInTheDocument();
    });
  });
});
