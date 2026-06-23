import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// next/navigation は useRouter のみ使用
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// カレンダーに集約される各データソースの hook をモック
vi.mock("@/hooks/calendar/use-calendar", () => ({
  useSchedules: vi.fn(() => ({ data: [] })),
  useCreateSchedule: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateSchedule: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteSchedule: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock("@/hooks/profile/use-reservations", () => ({
  useMyReservations: vi.fn(() => ({ data: [] })),
}));
vi.mock("@/hooks/profile/use-tasks", () => ({
  useMyTasks: vi.fn(() => ({ data: [] })),
}));
vi.mock("@/hooks/profile/use-tickets", () => ({
  useMyTickets: vi.fn(() => ({ data: [] })),
}));
vi.mock("@/hooks/profile/use-project-calendar", () => ({
  useMyProjectSchedules: vi.fn(() => ({ data: [] })),
}));
vi.mock("@/hooks/skills/use-skills", () => ({
  useSkillBookings: vi.fn(() => ({ data: [] })),
}));
vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "me" } })),
}));

// Calendar コンポーネントは描画ロジックが重いので、日付クリックだけ再現する軽量モックに差し替える
vi.mock("@/components/calendar", () => ({
  Calendar: ({ onDayClick }: { onDayClick: (date: Date, items: unknown[]) => void }) => (
    <button data-testid="day-cell" onClick={() => onDayClick(new Date(2026, 5, 23), [])}>
      day
    </button>
  ),
}));

import ProfileCalendarPage from "./page";

function renderPage() {
  return renderWithProviders(<ProfileCalendarPage />);
}

describe("ProfileCalendarPage（マイカレンダー）", () => {
  describe("初期表示", () => {
    it("見出し『カレンダー』とフィルターラベルが表示される", () => {
      renderPage();
      expect(screen.getByRole("heading", { name: "カレンダー" })).toBeInTheDocument();
      expect(screen.getByText("マイ予約")).toBeInTheDocument();
      expect(screen.getByText("プロジェクトの予定")).toBeInTheDocument();
    });
  });

  describe("日付ダイアログ", () => {
    it("日付をクリックすると年月日タイトルと空状態が表示される", async () => {
      const user = (await import("@testing-library/user-event")).default;
      renderPage();
      await user.click(screen.getByTestId("day-cell"));
      expect(screen.getByText("2026年6月23日")).toBeInTheDocument();
      expect(screen.getByText("予定はありません")).toBeInTheDocument();
    });

    it("『予定を追加』を押すとフォームの入力ラベルが表示される", async () => {
      const user = (await import("@testing-library/user-event")).default;
      renderPage();
      await user.click(screen.getByTestId("day-cell"));
      await user.click(screen.getByRole("button", { name: "予定を追加" }));
      expect(screen.getByText("タイトル")).toBeInTheDocument();
      expect(screen.getByText("場所")).toBeInTheDocument();
    });
  });
});
