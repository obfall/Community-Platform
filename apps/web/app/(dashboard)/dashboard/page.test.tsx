import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

// 各ウィジェットは独立してテストしているので、ここでは順序確認用にスタブ化する
vi.mock("@/components/notifications/announcements-widget", () => ({
  AnnouncementsWidget: () => <div data-testid="widget-announcements">announcements</div>,
}));

vi.mock("@/components/surveys/pending-surveys-widget", () => ({
  PendingSurveysWidget: () => <div data-testid="widget-pending-surveys">pending-surveys</div>,
}));

vi.mock("@/components/events/upcoming-events-widget", () => ({
  UpcomingEventsWidget: () => <div data-testid="widget-upcoming-events">upcoming-events</div>,
}));

vi.mock("@/components/calendar/upcoming-schedule-widget", () => ({
  UpcomingScheduleWidget: () => <div data-testid="widget-upcoming-schedule">upcoming-schedule</div>,
}));

import DashboardPage from "./page";
import { useAuth } from "@/hooks/auth/use-auth";

function setAuth(user: { name: string } | null) {
  vi.mocked(useAuth).mockReturnValue({ user } as never);
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("welcome 表示", () => {
    it("user.name があれば『ようこそ、◯◯さん』が表示される", () => {
      setAuth({ name: "太郎" });
      renderWithProviders(<DashboardPage />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ようこそ、太郎さん");
    });

    it("user が null なら『ようこそ』のみ", () => {
      setAuth(null);
      renderWithProviders(<DashboardPage />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ようこそ");
      expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent("さん");
    });
  });

  describe("ウィジェット並び順", () => {
    it("お知らせ → アンケート → 今後のイベント・直近の予定 の順で並ぶ", () => {
      setAuth({ name: "太郎" });
      const { container } = renderWithProviders(<DashboardPage />);

      const widgets = container.querySelectorAll("[data-testid^='widget-']");
      const ids = Array.from(widgets).map((el) => el.getAttribute("data-testid"));
      expect(ids).toEqual([
        "widget-announcements",
        "widget-pending-surveys",
        "widget-upcoming-events",
        "widget-upcoming-schedule",
      ]);
    });
  });
});
