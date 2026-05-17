import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/events",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/events/use-events", () => ({
  useEvents: vi.fn(),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(),
}));

import EventsPage from "./page";
import { useEvents } from "@/hooks/events/use-events";
import { useAuth } from "@/hooks/auth/use-auth";

type Role = "admin" | "owner" | "member" | "visitor";

const baseMeta = {
  total: 1,
  page: 1,
  limit: 12,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

function setAuth(role: Role) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "u1", name: "u", email: "u@x.test", role, status: "active" },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as never);
}

function setEvents(over: { data?: unknown[]; isLoading?: boolean } = {}) {
  vi.mocked(useEvents).mockReturnValue({
    data: { data: over.data ?? [], meta: { ...baseMeta, total: over.data?.length ?? 0 } },
    isLoading: over.isLoading ?? false,
  } as never);
}

const baseEvent = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "e1",
  title: "勉強会",
  description: "",
  titleHighlighted: undefined,
  snippetHighlighted: undefined,
  locationType: "venue",
  venueId: null,
  venueName: "渋谷",
  startAt: "2026-06-01T10:00:00Z",
  endAt: "2026-06-01T12:00:00Z",
  status: "recruiting",
  coverImageUrl: null,
  participantCount: 3,
  createdBy: { id: "u1", name: "u" },
  ticketCount: 1,
  totalCapacity: 10,
  minPrice: null,
  tags: [],
  createdAt: "2026-05-01T00:00:00Z",
  ...over,
});

describe("EventsPage（一覧）: role による UI 制御", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("admin / owner のとき", () => {
    it("新規作成ボタンが表示される", () => {
      setAuth("admin");
      setEvents();
      renderWithProviders(<EventsPage />);
      expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    });

    it("ステータスフィルタ（SelectField）が表示される", () => {
      setAuth("owner");
      setEvents();
      renderWithProviders(<EventsPage />);
      // SelectField の Trigger は combobox role を持つ。admin/owner にのみ出る。
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  describe("非 admin（member / visitor）のとき", () => {
    it("新規作成ボタンが表示されない", () => {
      setAuth("member");
      setEvents();
      renderWithProviders(<EventsPage />);
      expect(screen.queryByRole("button", { name: "新規作成" })).not.toBeInTheDocument();
    });

    it("ステータスフィルタが表示されない（API 側で recruiting に強制されるため UI でも隠す）", () => {
      setAuth("visitor");
      setEvents();
      renderWithProviders(<EventsPage />);
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("一覧表示", () => {
    it("isLoading 中は loading 文言が出る", () => {
      setAuth("member");
      setEvents({ isLoading: true });
      renderWithProviders(<EventsPage />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("空のときは empty 文言が出る", () => {
      setAuth("member");
      setEvents({ data: [] });
      renderWithProviders(<EventsPage />);
      expect(screen.getByText("イベントがありません")).toBeInTheDocument();
    });

    it("イベントカードにタイトルとステータスバッジが出る", () => {
      setAuth("member");
      setEvents({
        data: [baseEvent({ id: "e1", title: "Vitest 勉強会", status: "recruiting" })],
      });
      renderWithProviders(<EventsPage />);

      expect(screen.getByText("Vitest 勉強会")).toBeInTheDocument();
      // enums.eventStatus.recruiting は「募集中」
      expect(screen.getByText("募集中")).toBeInTheDocument();
    });

    it("カードのリンクが /events/:id を指す", () => {
      setAuth("member");
      setEvents({ data: [baseEvent({ id: "abc-123" })] });
      renderWithProviders(<EventsPage />);
      const link = screen.getByText("勉強会").closest("a")!;
      expect(link).toHaveAttribute("href", "/events/abc-123");
    });
  });
});
