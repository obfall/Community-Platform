import { describe, it, expect, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

// page.tsx は params Promise を `use()` で解いて TopicDetailView に渡すだけなので、
// TopicDetailView 本体はモック化して受け取った props を画面に出す
vi.mock("@/components/board/topic-detail-view", () => ({
  TopicDetailView: vi.fn(({ topicId, scope }: { topicId: string; scope: { kind: string } }) => (
    <div data-testid="topic-detail-view">
      <span data-testid="topic-id">{topicId}</span>
      <span data-testid="scope">{scope.kind}</span>
    </div>
  )),
}));

import BoardTopicPage from "./page";

describe("BoardTopicPage", () => {
  it("params Promise の id を TopicDetailView に渡し、scope: global を指定する", async () => {
    const params = Promise.resolve({ id: "topic-123" });
    await act(async () => {
      renderWithProviders(<BoardTopicPage params={params} />);
    });

    // use(params) が Suspense 経由で解決されるまで待つ
    await waitFor(() => expect(screen.getByTestId("topic-id")).toBeInTheDocument());
    expect(screen.getByTestId("topic-id")).toHaveTextContent("topic-123");
    expect(screen.getByTestId("scope")).toHaveTextContent("global");
  });
});
