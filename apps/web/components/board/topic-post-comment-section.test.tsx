import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/board/use-board", () => ({
  useTopicPostComments: vi.fn(),
  useCreateTopicPostComment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateTopicPostComment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteTopicPostComment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleTopicPostCommentLike: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ canEditAuthor: () => false })),
}));

import { TopicPostCommentSection } from "./topic-post-comment-section";
import { useTopicPostComments } from "@/hooks/board/use-board";

const baseComment = {
  id: "c-1",
  body: "コメント本文",
  likeCount: 0,
  isLiked: false,
  author: { id: "u-1", name: "太郎" },
  childComments: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("TopicPostCommentSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("コメント 0 件なら『まだコメントはありません』表示", () => {
    vi.mocked(useTopicPostComments).mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    } as never);
    renderWithProviders(<TopicPostCommentSection postId="p-1" />);
    expect(screen.getByText("まだコメントはありません")).toBeInTheDocument();
  });

  it("コメント一覧が表示される", () => {
    vi.mocked(useTopicPostComments).mockReturnValue({
      data: { data: [baseComment], meta: { total: 1, page: 1, totalPages: 1 } },
      isLoading: false,
    } as never);
    renderWithProviders(<TopicPostCommentSection postId="p-1" />);
    expect(screen.getByText("コメント本文")).toBeInTheDocument();
  });

  it("コメント入力エリアが表示される", () => {
    vi.mocked(useTopicPostComments).mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    } as never);
    renderWithProviders(<TopicPostCommentSection postId="p-1" />);
    expect(screen.getByPlaceholderText("コメントを入力...")).toBeInTheDocument();
  });
});
