import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/board/use-board", () => ({
  useTopicPosts: vi.fn(),
  useCreateTopicPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateTopicPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteTopicPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleTopicPostLike: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ canEditAuthor: () => false })),
}));

vi.mock("./topic-post-comment-section", () => ({
  TopicPostCommentSection: () => <div data-testid="comment-section" />,
}));

import { TopicPostSection } from "./topic-post-section";
import { useTopicPosts } from "@/hooks/board/use-board";

const basePost = {
  id: "p-1",
  body: "投稿本文テスト",
  likeCount: 1,
  commentCount: 0,
  isLiked: false,
  author: { id: "u-1", name: "太郎" },
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("TopicPostSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("投稿 0 件なら『まだ投稿はありません』表示", () => {
    vi.mocked(useTopicPosts).mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    } as never);
    renderWithProviders(<TopicPostSection topicId="t-1" />);
    expect(screen.getByText("まだ投稿はありません")).toBeInTheDocument();
  });

  it("投稿一覧が表示される", () => {
    vi.mocked(useTopicPosts).mockReturnValue({
      data: { data: [basePost], meta: { total: 1, page: 1, totalPages: 1 } },
      isLoading: false,
    } as never);
    renderWithProviders(<TopicPostSection topicId="t-1" />);
    expect(screen.getByText("投稿本文テスト")).toBeInTheDocument();
  });

  it("投稿入力エリアが表示される", () => {
    vi.mocked(useTopicPosts).mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    } as never);
    renderWithProviders(<TopicPostSection topicId="t-1" />);
    expect(screen.getByPlaceholderText("投稿を入力...")).toBeInTheDocument();
  });
});
