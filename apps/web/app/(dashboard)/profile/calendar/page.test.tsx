import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// next/navigation は useRouter のみ使用
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// 作成 mutation の mutate は onSuccess を即時に呼び、保存成功フローを再現する
const createMutate = vi.fn((_payload, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());

// カレンダーに集約される各データソースの hook をモック
vi.mock("@/hooks/calendar/use-calendar", () => ({
  useSchedules: vi.fn(() => ({ data: [] })),
  useCreateSchedule: vi.fn(() => ({ mutate: createMutate, isPending: false })),
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

    it("予定を保存するとダイアログが閉じてカレンダー表示に戻る", async () => {
      const user = (await import("@testing-library/user-event")).default;
      renderPage();
      await user.click(screen.getByTestId("day-cell"));
      await user.click(screen.getByRole("button", { name: "予定を追加" }));
      // タイトルを入力（保存ボタンの活性化に必須）。textbox の先頭がタイトル入力
      await user.type(screen.getAllByRole("textbox")[0], "打ち合わせ");
      await user.click(screen.getByRole("button", { name: "保存" }));
      // onSuccess → closeDialog でダイアログが閉じ、日付タイトルが消える
      expect(createMutate).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("2026年6月23日")).not.toBeInTheDocument();
    });
  });
});
