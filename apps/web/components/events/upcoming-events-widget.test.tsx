import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/events/use-events", () => ({
  useUpcomingEvents: vi.fn(),
}));

import { UpcomingEventsWidget } from "./upcoming-events-widget";
import { useUpcomingEvents } from "@/hooks/events/use-events";

const sampleEvent = (over: Partial<{ id: string; title: string; venueName: string | null }>) => ({
  id: over.id ?? "e1",
  title: over.title ?? "勉強会",
  startAt: "2026-12-20T10:00:00Z",
  endAt: "2026-12-20T12:00:00Z",
  locationType: "offline",
  status: "recruiting",
  coverImageUrl: null,
  venueName: "venueName" in over ? (over.venueName as string | null) : "渋谷",
});

function mockUpcoming(data: ReturnType<typeof sampleEvent>[], opts?: { loading?: boolean }) {
  vi.mocked(useUpcomingEvents).mockReturnValue({
    data,
    isLoading: opts?.loading ?? false,
  } as never);
}

describe("UpcomingEventsWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タイトル『今後のイベント』が表示される", () => {
    mockUpcoming([]);
    renderWithProviders(<UpcomingEventsWidget />);
    expect(screen.getByText("今後のイベント")).toBeInTheDocument();
  });

  it("空状態のメッセージが出る", () => {
    mockUpcoming([]);
    renderWithProviders(<UpcomingEventsWidget />);
    expect(screen.getByText("予定されているイベントはありません")).toBeInTheDocument();
  });

  it("loading 中は loading メッセージを出す", () => {
    mockUpcoming([], { loading: true });
    renderWithProviders(<UpcomingEventsWidget />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("イベント一覧が描画され、各リンクが /events/:id を指す", () => {
    mockUpcoming([
      sampleEvent({ id: "e1", title: "勉強会A" }),
      sampleEvent({ id: "e2", title: "勉強会B" }),
    ]);
    renderWithProviders(<UpcomingEventsWidget />);

    const linkA = screen.getByText("勉強会A").closest("a")!;
    const linkB = screen.getByText("勉強会B").closest("a")!;
    expect(linkA).toHaveAttribute("href", "/events/e1");
    expect(linkB).toHaveAttribute("href", "/events/e2");
  });

  it("venueName が null の時は MapPin の行が出ない", () => {
    mockUpcoming([sampleEvent({ id: "e1", title: "オンライン勉強会", venueName: null })]);
    renderWithProviders(<UpcomingEventsWidget />);
    expect(screen.getByText("オンライン勉強会")).toBeInTheDocument();
    expect(screen.queryByText("渋谷")).not.toBeInTheDocument();
  });

  it("ヘッダーの『すべて見る』が /events へリンクしている", () => {
    mockUpcoming([]);
    renderWithProviders(<UpcomingEventsWidget />);
    const seeAll = screen.getByText("すべて見る").closest("a")!;
    expect(seeAll).toHaveAttribute("href", "/events");
  });
});
