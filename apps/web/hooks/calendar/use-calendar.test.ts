import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/calendar", () => ({
  schedulesApi: {
    getAll: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useSchedules } from "./use-calendar";
import { schedulesApi } from "@/lib/api/calendar";

describe("useSchedules: スケジュール取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("引数なしでも呼べて、schedulesApi.getAll(undefined) になる", async () => {
    vi.mocked(schedulesApi.getAll).mockResolvedValue([]);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSchedules(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(schedulesApi.getAll).toHaveBeenCalledWith(undefined);
  });

  it("query を渡すと schedulesApi.getAll(query) で呼ばれる", async () => {
    vi.mocked(schedulesApi.getAll).mockResolvedValue([]);

    const query = {
      startAt: "2026-05-13T00:00:00.000Z",
      endAt: "2026-05-20T00:00:00.000Z",
    };
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSchedules(query), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(schedulesApi.getAll).toHaveBeenCalledWith(query);
  });

  it("取得したスケジュール配列がそのまま data になる", async () => {
    const mockData = [
      {
        id: "s1",
        title: "予定A",
        description: null,
        startAt: "2026-05-14T10:00:00.000Z",
        endAt: "2026-05-14T11:00:00.000Z",
        isAllDay: false,
        location: null,
        visibility: "private",
        sourceType: null,
        sourceId: null,
        createdAt: "2026-05-10T00:00:00.000Z",
      },
    ];
    vi.mocked(schedulesApi.getAll).mockResolvedValue(mockData);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSchedules(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
