import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/notifications/use-notifications", () => ({
  useNotifications: vi.fn(),
}));

import { AnnouncementsWidget } from "./announcements-widget";
import { useNotifications } from "@/hooks/notifications/use-notifications";

function buildAnnouncement(id: string, title: string) {
  return {
    id,
    type: "announcement",
    title,
    body: `${title} 本文`,
    referenceType: "broadcast",
    referenceId: id,
    isRead: false,
    readAt: null,
    createdAt: "2026-05-10T10:00:00Z",
    actor: null,
  };
}

function mockNotifications(
  items: ReturnType<typeof buildAnnouncement>[],
  opts?: { loading?: boolean },
) {
  vi.mocked(useNotifications).mockReturnValue({
    data: {
      data: items,
      meta: {
        total: items.length,
        page: 1,
        limit: 100,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: opts?.loading ?? false,
  } as never);
}

describe("AnnouncementsWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タイトル『お知らせ』が表示される", () => {
    mockNotifications([]);
    renderWithProviders(<AnnouncementsWidget />);
    expect(screen.getByText("お知らせ")).toBeInTheDocument();
  });

  it("空状態のメッセージが出る", () => {
    mockNotifications([]);
    renderWithProviders(<AnnouncementsWidget />);
    expect(screen.getByText("運営からの新しいお知らせはありません")).toBeInTheDocument();
  });

  it("loading 中は loading メッセージを出す", () => {
    mockNotifications([], { loading: true });
    renderWithProviders(<AnnouncementsWidget />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("件数バッジが (N) 表記で出る", () => {
    mockNotifications([buildAnnouncement("a1", "重要なお知らせ"), buildAnnouncement("a2", "別件")]);
    renderWithProviders(<AnnouncementsWidget />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("4 件以上で『他 N 件を表示』ボタンが出て、押下で全件表示・折りたたみで戻る", () => {
    mockNotifications([
      buildAnnouncement("a1", "お知らせ1"),
      buildAnnouncement("a2", "お知らせ2"),
      buildAnnouncement("a3", "お知らせ3"),
      buildAnnouncement("a4", "お知らせ4"),
      buildAnnouncement("a5", "お知らせ5"),
    ]);
    renderWithProviders(<AnnouncementsWidget />);

    expect(screen.getByText("お知らせ1")).toBeInTheDocument();
    expect(screen.getByText("お知らせ3")).toBeInTheDocument();
    expect(screen.queryByText("お知らせ4")).not.toBeInTheDocument();
    expect(screen.getByText(/他 2 件を表示/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/他 2 件を表示/));
    expect(screen.getByText("お知らせ4")).toBeInTheDocument();
    expect(screen.getByText("お知らせ5")).toBeInTheDocument();
    expect(screen.getByText("折りたたむ")).toBeInTheDocument();

    fireEvent.click(screen.getByText("折りたたむ"));
    expect(screen.queryByText("お知らせ4")).not.toBeInTheDocument();
  });

  it("3 件以下なら展開ボタンが出ない", () => {
    mockNotifications([buildAnnouncement("a1", "お知らせ1"), buildAnnouncement("a2", "お知らせ2")]);
    renderWithProviders(<AnnouncementsWidget />);
    expect(screen.queryByText(/他 .+ 件を表示/)).not.toBeInTheDocument();
  });

  it("クリックしても遷移や mutation が起きない（表示のみ）", () => {
    mockNotifications([buildAnnouncement("a1", "お知らせ1")]);
    renderWithProviders(<AnnouncementsWidget />);
    const item = screen.getByText("お知らせ1");
    // ボタンではなく li 配下なので click イベントを発火しても何も起きない
    fireEvent.click(item);
    expect(useNotifications).toHaveBeenCalled();
    // 何らかの button にラップされていないことの確認
    expect(item.closest("button")).toBeNull();
  });
});
