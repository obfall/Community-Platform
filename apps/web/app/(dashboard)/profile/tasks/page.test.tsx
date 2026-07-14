import { describe, it, expect, vi, beforeAll } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";

// Radix UI（Dialog / Select）が参照する API は jsdom 未実装のため polyfill する
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
  usePathname: () => "/profile/tasks",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/profile/use-tasks", () => ({
  useMyTasks: vi.fn(),
}));

import ProfileTasksPage from "./page";
import { useMyTasks } from "@/hooks/profile/use-tasks";

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

function setTasks(partial: { data?: unknown; isLoading?: boolean } = {}) {
  vi.mocked(useMyTasks).mockReturnValue({
    data: asInfinite(partial.data),
    isLoading: partial.isLoading ?? false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
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
      // カード内のバッジで確認（「進行中」は絞り込みタブにも出るためカードにスコープする）
      const card = screen.getByRole("button", { name: /資料を作成する/ });
      // enums.videoTaskStatus.in_progress のラベル
      expect(within(card).getByText("進行中")).toBeInTheDocument();
    });
  });

  describe("ステータス絞り込み（プルダウン）", () => {
    it("初期表示は status 未指定（すべて）で呼ばれ、プルダウンが表示される", () => {
      setTasks({ data: [] });
      renderWithProviders(<ProfileTasksPage />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(vi.mocked(useMyTasks)).toHaveBeenCalledWith(undefined);
    });

    it("プルダウンで『完了』を選ぶと useMyTasks がそのステータスで呼ばれる", async () => {
      const user = userEvent.setup();
      setTasks({ data: [] });
      renderWithProviders(<ProfileTasksPage />);

      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByRole("option", { name: "完了" }));

      expect(vi.mocked(useMyTasks)).toHaveBeenCalledWith("completed");
    });
  });

  describe("もっと見る", () => {
    it("hasNextPage が true のとき『もっと見る』で fetchNextPage が呼ばれる", async () => {
      const user = userEvent.setup();
      const fetchNextPage = vi.fn();
      vi.mocked(useMyTasks).mockReturnValue({
        data: asInfinite([
          {
            id: "tk1",
            title: "資料を作成する",
            status: "in_progress",
            dueDate: null,
            project: { id: "pr1", name: "広報プロジェクト" },
          },
        ]),
        isLoading: false,
        hasNextPage: true,
        fetchNextPage,
        isFetchingNextPage: false,
      } as never);
      renderWithProviders(<ProfileTasksPage />);

      await user.click(screen.getByRole("button", { name: "もっと見る" }));
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });
  });

  describe("詳細ダイアログ", () => {
    it("タスクをクリックすると詳細ダイアログが開き、プロジェクト名・期限・詳細が表示される", async () => {
      const user = userEvent.setup();
      setTasks({
        data: [
          {
            id: "tk1",
            title: "資料を作成する",
            description: "登壇用のスライドを準備する",
            status: "in_progress",
            requestedDate: "2026-06-01",
            dueDate: "2026-07-10",
            project: { id: "pr1", name: "広報プロジェクト" },
          },
        ],
      });
      renderWithProviders(<ProfileTasksPage />);

      await user.click(screen.getByRole("button", { name: /資料を作成する/ }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("タスク詳細")).toBeInTheDocument();
      expect(within(dialog).getByText("広報プロジェクト")).toBeInTheDocument();
      expect(within(dialog).getByText("登壇用のスライドを準備する")).toBeInTheDocument();
      // プロジェクトのタスク一覧へのリンク
      expect(within(dialog).getByRole("link", { name: "タスク一覧を見る" })).toHaveAttribute(
        "href",
        "/projects/pr1/tasks",
      );
    });
  });
});
