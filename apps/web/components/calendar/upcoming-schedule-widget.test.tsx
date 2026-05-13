import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/calendar/use-calendar", () => ({
  useSchedules: vi.fn(),
}));

vi.mock("@/hooks/events/use-events", () => ({
  useMyUpcomingEvents: vi.fn(),
}));

import { UpcomingScheduleWidget } from "./upcoming-schedule-widget";
import { useSchedules } from "@/hooks/calendar/use-calendar";
import { useMyUpcomingEvents } from "@/hooks/events/use-events";

const HOUR = 60 * 60 * 1000;

function isoFromNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function buildSchedule(over: {
  id: string;
  title: string;
  startOffsetH: number;
  endOffsetH: number;
  location?: string | null;
}) {
  return {
    id: over.id,
    title: over.title,
    description: null,
    startAt: isoFromNow(over.startOffsetH * HOUR),
    endAt: isoFromNow(over.endOffsetH * HOUR),
    isAllDay: false,
    location: over.location ?? null,
    visibility: "private",
    sourceType: null,
    sourceId: null,
    createdAt: isoFromNow(-24 * HOUR),
  };
}

function buildEvent(over: {
  eventId: string;
  title: string;
  startOffsetH: number;
  endOffsetH: number;
  venueName?: string | null;
}) {
  return {
    eventId: over.eventId,
    title: over.title,
    startAt: isoFromNow(over.startOffsetH * HOUR),
    endAt: isoFromNow(over.endOffsetH * HOUR),
    locationType: "offline",
    venueName: over.venueName ?? null,
    participantStatus: "applied",
  };
}

function mockHooks(
  schedules: ReturnType<typeof buildSchedule>[],
  events: ReturnType<typeof buildEvent>[],
  opts?: { loading?: boolean },
) {
  vi.mocked(useSchedules).mockReturnValue({
    data: schedules,
    isLoading: opts?.loading ?? false,
  } as never);
  vi.mocked(useMyUpcomingEvents).mockReturnValue({
    data: events,
    isLoading: opts?.loading ?? false,
  } as never);
}

describe("UpcomingScheduleWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("空・読み込み中の表示", () => {
    it("両方空なら『予定はありません』が表示される", () => {
      mockHooks([], []);
      renderWithProviders(<UpcomingScheduleWidget />);
      expect(screen.getByText("予定はありません")).toBeInTheDocument();
    });

    it("loading 中は loading メッセージを出す", () => {
      mockHooks([], [], { loading: true });
      renderWithProviders(<UpcomingScheduleWidget />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("merge と並び順", () => {
    it("schedule と event をマージして startAt 昇順で並べる", () => {
      mockHooks(
        [buildSchedule({ id: "s1", title: "予定A", startOffsetH: 5, endOffsetH: 6 })],
        [buildEvent({ eventId: "e1", title: "イベントA", startOffsetH: 2, endOffsetH: 4 })],
      );
      renderWithProviders(<UpcomingScheduleWidget />);
      const items = screen.getAllByRole("listitem");
      // 先に startOffsetH=2 のイベント、後に startOffsetH=5 の予定
      expect(within(items[0]!).getByText("イベントA")).toBeInTheDocument();
      expect(within(items[1]!).getByText("予定A")).toBeInTheDocument();
    });
  });

  describe("過去除外", () => {
    it("endAt が現在より前のアイテムは表示されない", () => {
      mockHooks(
        [
          buildSchedule({ id: "past", title: "過ぎた予定", startOffsetH: -3, endOffsetH: -1 }),
          buildSchedule({ id: "future", title: "これからの予定", startOffsetH: 1, endOffsetH: 2 }),
        ],
        [
          buildEvent({
            eventId: "past-e",
            title: "過ぎたイベント",
            startOffsetH: -5,
            endOffsetH: -2,
          }),
          buildEvent({
            eventId: "future-e",
            title: "これからのイベント",
            startOffsetH: 3,
            endOffsetH: 4,
          }),
        ],
      );
      renderWithProviders(<UpcomingScheduleWidget />);
      expect(screen.queryByText("過ぎた予定")).not.toBeInTheDocument();
      expect(screen.queryByText("過ぎたイベント")).not.toBeInTheDocument();
      expect(screen.getByText("これからの予定")).toBeInTheDocument();
      expect(screen.getByText("これからのイベント")).toBeInTheDocument();
    });
  });

  describe("バッジ表示", () => {
    it("schedule は『予定』、event は『イベント』のバッジが付く", () => {
      mockHooks(
        [buildSchedule({ id: "s1", title: "予定A", startOffsetH: 1, endOffsetH: 2 })],
        [buildEvent({ eventId: "e1", title: "イベントA", startOffsetH: 3, endOffsetH: 4 })],
      );
      renderWithProviders(<UpcomingScheduleWidget />);
      const scheduleLi = screen.getByText("予定A").closest("li")!;
      const eventLi = screen.getByText("イベントA").closest("li")!;
      expect(within(scheduleLi).getByText("予定")).toBeInTheDocument();
      expect(within(eventLi).getByText("イベント")).toBeInTheDocument();
    });
  });

  describe("展開・折りたたみ", () => {
    it("4 件以上のときに『他 N 件を表示』が出る（初期は 3 件のみ）", () => {
      mockHooks(
        [
          buildSchedule({ id: "s1", title: "予定1", startOffsetH: 1, endOffsetH: 2 }),
          buildSchedule({ id: "s2", title: "予定2", startOffsetH: 3, endOffsetH: 4 }),
          buildSchedule({ id: "s3", title: "予定3", startOffsetH: 5, endOffsetH: 6 }),
          buildSchedule({ id: "s4", title: "予定4", startOffsetH: 7, endOffsetH: 8 }),
          buildSchedule({ id: "s5", title: "予定5", startOffsetH: 9, endOffsetH: 10 }),
        ],
        [],
      );
      renderWithProviders(<UpcomingScheduleWidget />);
      expect(screen.getByText("予定1")).toBeInTheDocument();
      expect(screen.getByText("予定2")).toBeInTheDocument();
      expect(screen.getByText("予定3")).toBeInTheDocument();
      expect(screen.queryByText("予定4")).not.toBeInTheDocument();
      expect(screen.getByText(/他 2 件を表示/)).toBeInTheDocument();
    });

    it("展開ボタン押下で全件が表示され、折りたたみで戻る", () => {
      mockHooks(
        [
          buildSchedule({ id: "s1", title: "予定1", startOffsetH: 1, endOffsetH: 2 }),
          buildSchedule({ id: "s2", title: "予定2", startOffsetH: 3, endOffsetH: 4 }),
          buildSchedule({ id: "s3", title: "予定3", startOffsetH: 5, endOffsetH: 6 }),
          buildSchedule({ id: "s4", title: "予定4", startOffsetH: 7, endOffsetH: 8 }),
        ],
        [],
      );
      renderWithProviders(<UpcomingScheduleWidget />);

      fireEvent.click(screen.getByText(/他 1 件を表示/));
      expect(screen.getByText("予定4")).toBeInTheDocument();
      expect(screen.getByText("折りたたむ")).toBeInTheDocument();

      fireEvent.click(screen.getByText("折りたたむ"));
      expect(screen.queryByText("予定4")).not.toBeInTheDocument();
    });

    it("3 件以下なら展開ボタンは出ない", () => {
      mockHooks(
        [
          buildSchedule({ id: "s1", title: "予定1", startOffsetH: 1, endOffsetH: 2 }),
          buildSchedule({ id: "s2", title: "予定2", startOffsetH: 3, endOffsetH: 4 }),
        ],
        [],
      );
      renderWithProviders(<UpcomingScheduleWidget />);
      expect(screen.queryByText(/他 .+ 件を表示/)).not.toBeInTheDocument();
    });
  });
});
