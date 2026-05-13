import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/surveys", () => ({
  surveysApi: {
    getPending: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { usePendingSurveys } from "./use-surveys";
import { surveysApi } from "@/lib/api/surveys";

describe("usePendingSurveys: 未回答アンケート取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("surveysApi.getPending が呼ばれ、データが返る", async () => {
    const mockData = [
      {
        id: "s1",
        title: "アンケート1",
        description: null,
        eventId: null,
        eventTitle: null,
        questionCount: 5,
        createdAt: "2026-05-10T00:00:00Z",
      },
    ];
    vi.mocked(surveysApi.getPending).mockResolvedValue(mockData);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => usePendingSurveys(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(surveysApi.getPending).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockData);
  });

  it("queryKey が ['surveys', 'pending'] で一意", async () => {
    vi.mocked(surveysApi.getPending).mockResolvedValue([]);

    const { wrapper, queryClient } = createHookWrapper();
    renderHook(() => usePendingSurveys(), { wrapper });

    await waitFor(() => expect(queryClient.getQueryData(["surveys", "pending"])).toEqual([]));
  });
});
