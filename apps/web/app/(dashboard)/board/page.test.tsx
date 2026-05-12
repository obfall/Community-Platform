import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// page.tsx の責務（scope と i18n 化された heading を渡す）に絞り、
// BoardView 本体は別途テストされる前提でモック化する
vi.mock("@/components/board/board-view", () => ({
  BoardView: vi.fn(
    ({
      scope,
      heading,
    }: {
      scope: { kind: string };
      heading?: { title: string; description?: string };
    }) => (
      <div data-testid="board-view">
        <h1>{heading?.title}</h1>
        {heading?.description && <p>{heading.description}</p>}
        <span data-testid="scope">{scope.kind}</span>
      </div>
    ),
  ),
}));

import BoardPage from "./page";

describe("BoardPage", () => {
  it("scope: global を BoardView に渡す", () => {
    renderWithProviders(<BoardPage />);
    expect(screen.getByTestId("scope")).toHaveTextContent("global");
  });

  it("i18n の heading.title / heading.description を BoardView に渡す", () => {
    renderWithProviders(<BoardPage />);
    expect(screen.getByRole("heading", { name: "掲示板" })).toBeInTheDocument();
    expect(screen.getByText("コミュニティの掲示板")).toBeInTheDocument();
  });
});
