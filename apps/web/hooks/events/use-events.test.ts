import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/events", () => ({
  eventsApi: {
    getUpcomingEvents: vi.fn(),
    getMyUpcomingEvents: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useUpcomingEvents, useMyUpcomingEvents } from "./use-events";
import { eventsApi } from "@/lib/api/events";

describe("events hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useUpcomingEvents: 今後のイベント取得", () => {
    it("eventsApi.getUpcomingEvents が limit 付きで呼ばれ、データが返る", async () => {
      const mockData = [
        {
          id: "e1",
          title: "勉強会",
          startAt: "2026-05-20T10:00:00Z",
          endAt: "2026-05-20T12:00:00Z",
          locationType: "offline",
          status: "recruiting",
          coverImageUrl: null,
          venueName: "渋谷",
        },
      ];
      vi.mocked(eventsApi.getUpcomingEvents).mockResolvedValue(mockData);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpcomingEvents(3), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(eventsApi.getUpcomingEvents).toHaveBeenCalledWith(3);
    });

    it("limit 未指定でも呼ばれる（undefined 渡しを許容）", async () => {
      vi.mocked(eventsApi.getUpcomingEvents).mockResolvedValue([]);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpcomingEvents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(eventsApi.getUpcomingEvents).toHaveBeenCalledWith(undefined);
    });
  });

  describe("useMyUpcomingEvents: 自分の参加予定イベント取得", () => {
    it("eventsApi.getMyUpcomingEvents が days 付きで呼ばれ、データが返る", async () => {
      const mockData = [
        {
          eventId: "e1",
          title: "勉強会",
          startAt: "2026-05-20T10:00:00Z",
          endAt: "2026-05-20T12:00:00Z",
          locationType: "offline",
          venueName: "渋谷",
          participantStatus: "applied",
        },
      ];
      vi.mocked(eventsApi.getMyUpcomingEvents).mockResolvedValue(mockData);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMyUpcomingEvents(7), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(eventsApi.getMyUpcomingEvents).toHaveBeenCalledWith(7);
    });

    it("days 未指定でも呼ばれる（undefined 渡しを許容）", async () => {
      vi.mocked(eventsApi.getMyUpcomingEvents).mockResolvedValue([]);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMyUpcomingEvents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(eventsApi.getMyUpcomingEvents).toHaveBeenCalledWith(undefined);
    });
  });
});
