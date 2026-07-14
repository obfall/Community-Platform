import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/activity",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/auth/use-auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1" } })),
}));

vi.mock("@/hooks/members/use-members", () => ({
  useMemberEvents: vi.fn(),
  useMemberProjects: vi.fn(),
}));

import ProfileActivityPage from "./page";
import { useMemberEvents, useMemberProjects } from "@/hooks/members/use-members";

function setResult(events: unknown, projects: unknown) {
  vi.mocked(useMemberEvents).mockReturnValue({ data: events } as never);
  vi.mocked(useMemberProjects).mockReturnValue({ data: projects } as never);
}

describe("ProfileActivityPage（アクティビティ）", () => {
  describe("空状態", () => {
    it("イベント・プロジェクトが 0 件のとき各空メッセージが表示される", () => {
      setResult([], []);
      renderWithProviders(<ProfileActivityPage />);
      expect(screen.getByText("参加イベントはありません")).toBeInTheDocument();
      expect(screen.getByText("参加プロジェクトはありません")).toBeInTheDocument();
    });
  });

  describe("一覧表示", () => {
    it("イベントの title とステータスラベルが表示される", () => {
      setResult(
        [{ id: "e1", title: "新年会", startAt: "2026-01-10T00:00:00Z", status: "recruiting" }],
        [],
      );
      renderWithProviders(<ProfileActivityPage />);
      expect(screen.getByText("新年会")).toBeInTheDocument();
      // enums.eventStatus.recruiting = 「募集中」
      expect(screen.getByText("募集中")).toBeInTheDocument();
    });

    it("プロジェクトの name とステータスラベルが表示される", () => {
      setResult(
        [],
        [
          {
            id: "p1",
            name: "地域マップ",
            description: null,
            memberCount: 3,
            status: "in_progress",
          },
        ],
      );
      renderWithProviders(<ProfileActivityPage />);
      expect(screen.getByText("地域マップ")).toBeInTheDocument();
      // enums.projectStatus.in_progress = 「進行中」
      expect(screen.getByText("進行中")).toBeInTheDocument();
    });
  });

  describe("サマリー件数", () => {
    it("参加イベント・プロジェクトの件数が表示される", () => {
      setResult(
        [{ id: "e1", title: "A", startAt: "2026-01-10T00:00:00Z", status: "ended" }],
        [
          { id: "p1", name: "B", description: null, memberCount: 1, status: "completed" },
          { id: "p2", name: "C", description: null, memberCount: 2, status: "completed" },
        ],
      );
      renderWithProviders(<ProfileActivityPage />);
      // サマリーの件数は .text-2xl のバッジに限定する（memberCount などと曖昧になるため）
      expect(screen.getByText("1", { selector: ".text-2xl" })).toBeInTheDocument();
      expect(screen.getByText("2", { selector: ".text-2xl" })).toBeInTheDocument();
    });
  });
});
