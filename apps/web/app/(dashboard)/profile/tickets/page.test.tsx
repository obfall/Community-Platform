import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/profile/use-tickets", () => ({
  useMyTickets: vi.fn(),
}));

import ProfileTicketsPage from "./page";
import { useMyTickets } from "@/hooks/profile/use-tickets";

function setTickets(partial: { data?: unknown; isLoading?: boolean } = {}) {
  vi.mocked(useMyTickets).mockReturnValue({
    data: partial.data,
    isLoading: partial.isLoading ?? false,
  } as never);
}

describe("ProfileTicketsPage（マイチケット）", () => {
  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setTickets({ isLoading: true });
      renderWithProviders(<ProfileTicketsPage />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("空状態", () => {
    it("チケット 0 件のとき『チケットはありません』が表示される", () => {
      setTickets({ data: [] });
      renderWithProviders(<ProfileTicketsPage />);
      expect(screen.getByText("チケットはありません")).toBeInTheDocument();
    });
  });

  describe("一覧表示", () => {
    it("イベントタイトルとステータスラベルが表示される", () => {
      setTickets({
        data: [
          {
            id: "t1",
            status: "confirmed",
            quantity: 1,
            event: {
              id: "e1",
              title: "新年交流会",
              startAt: "2026-01-10T10:00:00Z",
              locationType: "venue",
              venueName: "東京会場",
            },
            ticket: null,
          },
        ],
      });
      renderWithProviders(<ProfileTicketsPage />);
      expect(screen.getByText("新年交流会")).toBeInTheDocument();
      // profile.tickets.status.confirmed のラベル
      expect(screen.getByText("確定")).toBeInTheDocument();
    });
  });
});
