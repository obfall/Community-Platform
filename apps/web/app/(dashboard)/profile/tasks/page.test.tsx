import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/tasks",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/profile/use-tasks", () => ({
  useMyTasks: vi.fn(),
}));

import ProfileTasksPage from "./page";
import { useMyTasks } from "@/hooks/profile/use-tasks";

function setTasks(partial: { data?: unknown; isLoading?: boolean } = {}) {
  vi.mocked(useMyTasks).mockReturnValue({
    data: partial.data,
    isLoading: partial.isLoading ?? false,
  } as never);
}

describe("ProfileTasksPage（マイタスク）", () => {
  describe("ロード状態", () => {
    it("isLoading 中は『読み込み中...』が表示される", () => {
      setTasks({ isLoading: true });
      renderWithProviders(<ProfileTasksPage />);
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });
  });

  describe("空状態", () => {
    it("タスク 0 件のとき『担当タスクはありません』が表示される", () => {
      setTasks({ data: [] });
      renderWithProviders(<ProfileTasksPage />);
      expect(screen.getByText("担当タスクはありません")).toBeInTheDocument();
    });
  });

  describe("一覧表示", () => {
    it("タスクのタイトルとステータスラベルが表示される", () => {
      setTasks({
        data: [
          {
            id: "tk1",
            title: "資料を作成する",
            status: "in_progress",
            dueDate: null,
            project: { id: "pr1", name: "広報プロジェクト" },
          },
        ],
      });
      renderWithProviders(<ProfileTasksPage />);
      expect(screen.getByText("資料を作成する")).toBeInTheDocument();
      // enums.videoTaskStatus.in_progress のラベル
      expect(screen.getByText("進行中")).toBeInTheDocument();
    });
  });
});
