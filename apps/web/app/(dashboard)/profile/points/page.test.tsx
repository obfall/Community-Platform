import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

import ProfilePointsPage from "./page";

// NOTE: ポイント機能は仕様未確定のため「準備中」表示。仕様確定後、
// 下部にコメントアウトで残した旧テストを page.tsx の元実装と一緒に復活させること。
describe("ProfilePointsPage（ポイント）", () => {
  it("準備中表示になっている", () => {
    renderWithProviders(<ProfilePointsPage />);
    expect(screen.getByText("準備中です")).toBeInTheDocument();
  });
});

/* ===== 仕様確定までコメントアウト（元テスト） =====
import { vi } from "vitest";
import { usePointSummary, usePointHistory } from "@/hooks/points/use-points";

vi.mock("@/hooks/points/use-points", () => ({
  usePointSummary: vi.fn(),
  usePointHistory: vi.fn(),
}));

function setMocks(opts: { summary?: unknown; history?: unknown } = {}) {
  vi.mocked(usePointSummary).mockReturnValue({ data: opts.summary } as never);
  vi.mocked(usePointHistory).mockReturnValue({ data: opts.history } as never);
}

describe("ProfilePointsPage（ポイント）", () => {
  describe("サマリー表示", () => {
    it("利用可能・累計獲得・累計利用のラベルが表示される", () => {
      setMocks({
        summary: { availablePoints: 100, totalGranted: 300, totalUtilized: 200 },
        history: { data: [] },
      });
      renderWithProviders(<ProfilePointsPage />);
      expect(screen.getByText("利用可能")).toBeInTheDocument();
      expect(screen.getByText("累計獲得")).toBeInTheDocument();
      expect(screen.getByText("累計利用")).toBeInTheDocument();
    });
  });

  describe("空状態", () => {
    it("履歴 0 件のとき『ポイント履歴はありません』が表示される", () => {
      setMocks({ summary: undefined, history: { data: [] } });
      renderWithProviders(<ProfilePointsPage />);
      expect(screen.getByText("ポイント履歴はありません")).toBeInTheDocument();
    });
  });

  describe("履歴表示", () => {
    it("履歴の説明文が表示される", () => {
      setMocks({
        summary: { availablePoints: 0, totalGranted: 0, totalUtilized: 0 },
        history: {
          data: [
            {
              id: "p1",
              type: "grant",
              description: "イベント参加ボーナス",
              points: 50,
              createdAt: "2026-01-01T00:00:00Z",
            },
          ],
        },
      });
      renderWithProviders(<ProfilePointsPage />);
      expect(screen.getByText("イベント参加ボーナス")).toBeInTheDocument();
    });
  });
});
===== 元テストここまで ===== */
