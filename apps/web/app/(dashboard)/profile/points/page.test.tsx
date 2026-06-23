import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/points/use-points", () => ({
  usePointSummary: vi.fn(),
  usePointHistory: vi.fn(),
}));

import ProfilePointsPage from "./page";
import { usePointSummary, usePointHistory } from "@/hooks/points/use-points";

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
