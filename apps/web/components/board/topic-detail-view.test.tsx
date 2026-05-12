import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/board/use-board", () => ({
  useTopic: vi.fn(),
  useDeleteTopic: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleTopicLike: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ canEditAuthor: () => false })),
}));

vi.mock("./topic-post-section", () => ({
  TopicPostSection: () => <div data-testid="topic-post-section" />,
}));
vi.mock("./edit-topic-dialog", () => ({
  EditTopicDialog: () => null,
}));

import { TopicDetailView } from "./topic-detail-view";
import { useTopic } from "@/hooks/board/use-board";

const baseTopic = {
  id: "t-1",
  title: "テストタイトル",
  body: "本文内容",
  publishStatus: "published",
  isPinned: false,
  sortOrder: 0,
  viewCount: 10,
  postCount: 2,
  likeCount: 3,
  author: { id: "u-1", name: "太郎" },
  category: { id: "cat-1", name: "雑談" },
  isLiked: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("TopicDetailView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ロード中はスケルトンを描画する", () => {
    vi.mocked(useTopic).mockReturnValue({ data: undefined, isLoading: true } as never);
    const { container } = renderWithProviders(
      <TopicDetailView scope={{ kind: "global" }} topicId="t-1" />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("topic が無ければ『トピックが見つかりません』を表示", () => {
    vi.mocked(useTopic).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderWithProviders(<TopicDetailView scope={{ kind: "global" }} topicId="t-1" />);
    expect(screen.getByText("トピックが見つかりません")).toBeInTheDocument();
  });

  it("topic ロード成功時に title / body / category が描画される", () => {
    vi.mocked(useTopic).mockReturnValue({ data: baseTopic, isLoading: false } as never);
    renderWithProviders(<TopicDetailView scope={{ kind: "global" }} topicId="t-1" />);
    expect(screen.getByText("テストタイトル")).toBeInTheDocument();
    expect(screen.getByText("本文内容")).toBeInTheDocument();
    expect(screen.getByText("雑談")).toBeInTheDocument();
    expect(screen.getByTestId("topic-post-section")).toBeInTheDocument();
  });
});
