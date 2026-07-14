import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// Radix UI（Dialog / AlertDialog）が参照する API は jsdom 未実装のため polyfill する
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/profile/use-tickets", () => ({
  useMyTickets: vi.fn(),
}));

vi.mock("@/hooks/events/use-events", () => ({
  useCancelParticipation: vi.fn(),
}));

import ProfileTicketsPage from "./page";
import { useMyTickets } from "@/hooks/profile/use-tickets";
import { useCancelParticipation } from "@/hooks/events/use-events";

const sampleTicket = {
  id: "p1",
  status: "applied",
  quantity: 2,
  paymentStatus: null,
  appliedAt: "2026-06-01T00:00:00Z",
  event: {
    id: "e1",
    title: "夏祭りイベント",
    startAt: "2026-07-01T10:00:00Z",
    endAt: "2026-07-01T12:00:00Z",
    status: "published",
    locationType: "venue",
    venueName: "中央ホール",
  },
  ticket: { id: "t1", ticketName: "一般チケット", price: 1000, currency: "JPY" },
};

// useInfiniteQuery の返り値形（pages 配列）に配列データを包む。
function asInfinite(data: unknown) {
  if (data === undefined) return undefined;
  return {
    pages: [
      {
        data,
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    ],
    pageParams: [1],
  };
}

function setupMocks(opts: { data?: unknown; isLoading?: boolean } = {}) {
  const cancelMutate = vi.fn();
  vi.mocked(useMyTickets).mockReturnValue({
    data: asInfinite(opts.data),
    isLoading: opts.isLoading ?? false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  } as never);
  vi.mocked(useCancelParticipation).mockReturnValue({
    mutate: cancelMutate,
    isPending: false,
  } as never);
  return { cancelMutate };
}

describe("ProfileTicketsPage（マイチケット）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setupMocks({ isLoading: true });
      renderWithProviders(<ProfileTicketsPage />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("空状態", () => {
    it("チケット 0 件のとき『チケットはありません』が表示される", () => {
      setupMocks({ data: [] });
      renderWithProviders(<ProfileTicketsPage />);
      expect(screen.getByText("チケットはありません")).toBeInTheDocument();
    });
  });

  describe("一覧表示（簡素）", () => {
    it("イベントタイトルとステータスラベルが表示される", () => {
      setupMocks({ data: [{ ...sampleTicket, status: "confirmed" }] });
      renderWithProviders(<ProfileTicketsPage />);
      expect(screen.getByText("夏祭りイベント")).toBeInTheDocument();
      // profile.tickets.status.confirmed のラベル
      expect(screen.getByText("確定")).toBeInTheDocument();
    });

    it("ダイアログを開く前は一覧にチケット名を表示しない", () => {
      setupMocks({ data: [sampleTicket] });
      renderWithProviders(<ProfileTicketsPage />);
      expect(screen.queryByText("一般チケット")).not.toBeInTheDocument();
    });
  });

  describe("チケット詳細ダイアログ", () => {
    it("チケットを押すとダイアログが開き、詳細とイベントリンクが表示される", async () => {
      setupMocks({ data: [sampleTicket] });
      renderWithProviders(<ProfileTicketsPage />);

      await userEvent.click(screen.getByText("夏祭りイベント"));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("チケット詳細")).toBeInTheDocument();
      expect(within(dialog).getByText("一般チケット")).toBeInTheDocument();

      const eventLink = within(dialog).getByRole("link", { name: "イベントページを見る" });
      expect(eventLink).toHaveAttribute("href", "/events/e1");
    });

    it("閉じるボタンでダイアログが閉じる", async () => {
      setupMocks({ data: [sampleTicket] });
      renderWithProviders(<ProfileTicketsPage />);

      await userEvent.click(screen.getByText("夏祭りイベント"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("キャンセルボタンの表示制御", () => {
    it("status が applied のときキャンセルボタンが表示される", async () => {
      setupMocks({ data: [sampleTicket] });
      renderWithProviders(<ProfileTicketsPage />);

      await userEvent.click(screen.getByText("夏祭りイベント"));
      expect(screen.getByRole("button", { name: "申込をキャンセル" })).toBeInTheDocument();
    });

    it("status が attended（参加済）のときキャンセルボタンは表示されない", async () => {
      setupMocks({ data: [{ ...sampleTicket, status: "attended" }] });
      renderWithProviders(<ProfileTicketsPage />);

      await userEvent.click(screen.getByText("夏祭りイベント"));
      expect(screen.queryByRole("button", { name: "申込をキャンセル" })).not.toBeInTheDocument();
    });
  });

  describe("キャンセル実行", () => {
    it("確認ダイアログで実行するとイベントIDを引数に cancelParticipation が呼ばれる", async () => {
      const { cancelMutate } = setupMocks({ data: [sampleTicket] });
      renderWithProviders(<ProfileTicketsPage />);

      await userEvent.click(screen.getByText("夏祭りイベント"));
      await userEvent.click(screen.getByRole("button", { name: "申込をキャンセル" }));

      // AlertDialog の確認アクション
      await userEvent.click(screen.getByRole("button", { name: "キャンセルする" }));

      expect(cancelMutate).toHaveBeenCalledTimes(1);
      expect(cancelMutate.mock.calls[0]![0]).toBe("e1");
    });
  });
});
