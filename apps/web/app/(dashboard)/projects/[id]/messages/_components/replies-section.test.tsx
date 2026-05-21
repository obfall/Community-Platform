import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

const createReplyMutate = vi.fn();
const toggleReplyLikeMutate = vi.fn();

vi.mock("@/hooks/projects/use-projects", () => ({
  useThreadReplies: vi.fn(),
  useCreateReply: vi.fn(() => ({ mutate: createReplyMutate, isPending: false })),
  useToggleReplyLike: vi.fn(() => ({ mutate: toggleReplyLikeMutate })),
}));

import { RepliesSection } from "./replies-section";
import { useThreadReplies } from "@/hooks/projects/use-projects";

const REPLIES = [
  {
    id: "r-1",
    body: "おつかれさまです",
    likeCount: 2,
    isLiked: false,
    author: { id: "u-1", name: "佐藤", avatarUrl: null },
    createdAt: "2026-05-21T01:00:00.000Z",
  },
];

describe("RepliesSection: 返信一覧 + 投稿フォーム", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useThreadReplies).mockReturnValue({ data: REPLIES } as never);
  });

  it("返信本文と投稿者名が表示される", () => {
    renderWithProviders(<RepliesSection threadId="th-1" />);
    expect(screen.getByText("おつかれさまです")).toBeInTheDocument();
    expect(screen.getByText("佐藤")).toBeInTheDocument();
  });

  it("返信ボタンを押すと createReply.mutate に threadId / body が渡る", () => {
    renderWithProviders(<RepliesSection threadId="th-1" />);
    const input = screen.getByPlaceholderText("返信を入力...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ありがとう" } });
    fireEvent.click(screen.getByRole("button", { name: "返信" }));
    expect(createReplyMutate).toHaveBeenCalledWith(
      { threadId: "th-1", body: "ありがとう" },
      expect.any(Object),
    );
  });

  it("Enter キーで返信を送信する", () => {
    renderWithProviders(<RepliesSection threadId="th-1" />);
    const input = screen.getByPlaceholderText("返信を入力...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "了解" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(createReplyMutate).toHaveBeenCalledWith(
      { threadId: "th-1", body: "了解" },
      expect.any(Object),
    );
  });

  it("空白のみ入力時は createReply が呼ばれない", () => {
    renderWithProviders(<RepliesSection threadId="th-1" />);
    const input = screen.getByPlaceholderText("返信を入力...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(createReplyMutate).not.toHaveBeenCalled();
  });

  it("いいねボタン押下で toggleReplyLike.mutate に reply.id が渡る", () => {
    renderWithProviders(<RepliesSection threadId="th-1" />);
    // いいねカウント "2" を持つボタンを取得（heart アイコン + likeCount を内包）
    const likeButton = screen.getByRole("button", { name: /2/ });
    fireEvent.click(likeButton);
    expect(toggleReplyLikeMutate).toHaveBeenCalledWith("r-1");
  });
});
