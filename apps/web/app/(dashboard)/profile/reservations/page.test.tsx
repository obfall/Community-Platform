import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/reservations",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1" } })),
}));

vi.mock("@/hooks/profile/use-reservations", () => ({
  useMyReservations: vi.fn(),
}));

vi.mock("@/hooks/skills/use-skills", () => ({
  useSkillBookings: vi.fn(),
}));

import ProfileReservationsPage from "./page";
import { useMyReservations } from "@/hooks/profile/use-reservations";
import { useSkillBookings } from "@/hooks/skills/use-skills";

function setResult(opts: {
  reservations?: unknown;
  isLoading?: boolean;
  bookings?: unknown;
  isBookingsLoading?: boolean;
}) {
  vi.mocked(useMyReservations).mockReturnValue({
    data: opts.reservations,
    isLoading: opts.isLoading ?? false,
  } as never);
  vi.mocked(useSkillBookings).mockReturnValue({
    data: opts.bookings,
    isLoading: opts.isBookingsLoading ?? false,
  } as never);
}

describe("ProfileReservationsPage（マイ予約）", () => {
  describe("ロード状態", () => {
    it("読み込み中は common.loading『読み込み中...』が表示される", () => {
      setResult({ isLoading: true, isBookingsLoading: true });
      renderWithProviders(<ProfileReservationsPage />);
      expect(screen.getAllByText("読み込み中...").length).toBeGreaterThan(0);
    });
  });

  describe("空状態", () => {
    it("会場予約・スキル予約が無いとき各空メッセージが表示される", () => {
      setResult({ reservations: [], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);
      expect(screen.getByText("会場予約はありません")).toBeInTheDocument();
      expect(screen.getByText("承認済のスキル予約はありません")).toBeInTheDocument();
    });
  });

  describe("会場予約の表示", () => {
    it("予約タイトルとステータスラベルが表示される", () => {
      setResult({
        reservations: [
          {
            id: "r1",
            title: "定例ミーティング",
            status: "pending",
            startAt: "2026-02-01T01:00:00Z",
            endAt: "2026-02-01T02:00:00Z",
            space: { name: "会議室A", venue: { name: "本部" } },
          },
        ],
        bookings: [],
      });
      renderWithProviders(<ProfileReservationsPage />);
      expect(screen.getByText("定例ミーティング")).toBeInTheDocument();
      // reservations.status.pending = 「申請中」
      expect(screen.getByText("申請中")).toBeInTheDocument();
    });
  });

  describe("スキル予約の表示", () => {
    it("承認済の自分宛てブッキングがリクエスター名とともに表示される", () => {
      setResult({
        reservations: [],
        bookings: [
          {
            id: "b1",
            status: "approved",
            providerUserId: "u1",
            requesterUserId: "u2",
            scheduledAt: "2026-02-05T03:00:00Z",
            skillListing: { title: "英会話レッスン" },
            requester: { name: "佐藤 花子" },
            provider: { name: "山田 太郎" },
          },
        ],
      });
      renderWithProviders(<ProfileReservationsPage />);
      expect(screen.getByText("英会話レッスン")).toBeInTheDocument();
      // provider 視点なので相手はリクエスター
      expect(screen.getByText("リクエスター: 佐藤 花子")).toBeInTheDocument();
    });
  });
});
