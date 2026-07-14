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

vi.mock("@/hooks/venues/use-venues", () => ({
  useCancelReservation: vi.fn(),
}));

import ProfileReservationsPage from "./page";
import { useMyReservations } from "@/hooks/profile/use-reservations";
import { useSkillBookings } from "@/hooks/skills/use-skills";
import { useCancelReservation } from "@/hooks/venues/use-venues";

const sampleVenue = {
  id: "r1",
  title: "定例ミーティング",
  status: "pending",
  startAt: "2026-02-01T01:00:00Z",
  endAt: "2026-02-01T02:00:00Z",
  note: "プロジェクター利用",
  createdAt: "2026-01-20T00:00:00Z",
  space: { id: "s1", name: "会議室A", venue: { id: "v1", name: "本部" } },
};

const sampleSkillBooking = {
  id: "b1",
  status: "approved",
  providerUserId: "u1",
  requesterUserId: "u2",
  scheduledAt: "2026-02-05T03:00:00Z",
  message: "よろしくお願いします",
  skillListing: { id: "sk1", title: "英会話レッスン", price: 3000, durationMinutes: 60 },
  requester: { name: "佐藤 花子" },
  provider: { name: "山田 太郎" },
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

function setResult(opts: {
  reservations?: unknown;
  isLoading?: boolean;
  bookings?: unknown;
  isBookingsLoading?: boolean;
}) {
  const cancelMutate = vi.fn();
  vi.mocked(useMyReservations).mockReturnValue({
    data: asInfinite(opts.reservations),
    isLoading: opts.isLoading ?? false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  } as never);
  vi.mocked(useSkillBookings).mockReturnValue({
    data: opts.bookings,
    isLoading: opts.isBookingsLoading ?? false,
  } as never);
  vi.mocked(useCancelReservation).mockReturnValue({
    mutate: cancelMutate,
    isPending: false,
  } as never);
  return { cancelMutate };
}

describe("ProfileReservationsPage（マイ予約）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe("会場予約の一覧表示（簡素）", () => {
    it("予約タイトルとステータスラベルが表示される", () => {
      setResult({ reservations: [sampleVenue], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);
      // カード内のバッジで確認（「申請中」は絞り込みタブにも出るためカードにスコープする）
      const card = screen.getByRole("button", { name: /定例ミーティング/ });
      // reservations.status.pending = 「申請中」
      expect(within(card).getByText("申請中")).toBeInTheDocument();
    });

    it("ダイアログを開く前は一覧に備考を表示しない", () => {
      setResult({ reservations: [sampleVenue], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);
      expect(screen.queryByText("プロジェクター利用")).not.toBeInTheDocument();
    });
  });

  describe("会場予約 詳細ダイアログ", () => {
    it("予約を押すとダイアログが開き、詳細と会場リンクが表示される", async () => {
      setResult({ reservations: [sampleVenue], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);

      await userEvent.click(screen.getByText("定例ミーティング"));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("予約詳細")).toBeInTheDocument();
      expect(within(dialog).getByText("プロジェクター利用")).toBeInTheDocument();

      const venueLink = within(dialog).getByRole("link", { name: "会場ページを見る" });
      expect(venueLink).toHaveAttribute("href", "/venues/v1");
    });

    it("閉じるボタンでダイアログが閉じる", async () => {
      setResult({ reservations: [sampleVenue], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);

      await userEvent.click(screen.getByText("定例ミーティング"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("会場予約 キャンセルボタンの表示制御", () => {
    it("status が pending のときキャンセルボタンが表示される", async () => {
      setResult({ reservations: [sampleVenue], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);

      await userEvent.click(screen.getByText("定例ミーティング"));
      expect(screen.getByRole("button", { name: "予約をキャンセル" })).toBeInTheDocument();
    });

    it("status が canceled（キャンセル済）のときキャンセルボタンは表示されない", async () => {
      setResult({ reservations: [{ ...sampleVenue, status: "canceled" }], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);

      await userEvent.click(screen.getByText("定例ミーティング"));
      expect(screen.queryByRole("button", { name: "予約をキャンセル" })).not.toBeInTheDocument();
    });
  });

  describe("会場予約 キャンセル実行", () => {
    it("確認ダイアログで実行すると予約IDを引数に cancelReservation が呼ばれる", async () => {
      const { cancelMutate } = setResult({ reservations: [sampleVenue], bookings: [] });
      renderWithProviders(<ProfileReservationsPage />);

      await userEvent.click(screen.getByText("定例ミーティング"));
      await userEvent.click(screen.getByRole("button", { name: "予約をキャンセル" }));

      // AlertDialog の確認アクション
      await userEvent.click(screen.getByRole("button", { name: "キャンセルする" }));

      expect(cancelMutate).toHaveBeenCalledTimes(1);
      expect(cancelMutate.mock.calls[0]![0]).toBe("r1");
    });
  });

  describe("スキル予約の表示と詳細ダイアログ", () => {
    it("承認済の自分宛てブッキングがリクエスター名とともに表示される", () => {
      setResult({ reservations: [], bookings: [sampleSkillBooking] });
      renderWithProviders(<ProfileReservationsPage />);
      expect(screen.getByText("英会話レッスン")).toBeInTheDocument();
      // provider 視点なので相手はリクエスター
      expect(screen.getByText("リクエスター: 佐藤 花子")).toBeInTheDocument();
    });

    it("ブッキングを押すとダイアログが開き、予約詳細ページへのリンクが表示される", async () => {
      setResult({ reservations: [], bookings: [sampleSkillBooking] });
      renderWithProviders(<ProfileReservationsPage />);

      await userEvent.click(screen.getByText("英会話レッスン"));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("スキル予約詳細")).toBeInTheDocument();
      expect(within(dialog).getByText("よろしくお願いします")).toBeInTheDocument();

      const detailLink = within(dialog).getByRole("link", { name: "予約詳細を見る" });
      expect(detailLink).toHaveAttribute("href", "/skills/bookings/b1");
    });
  });
});
