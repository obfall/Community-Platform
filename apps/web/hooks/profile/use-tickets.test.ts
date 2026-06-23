import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/profile", () => ({
  profileApi: {
    getMyTickets: vi.fn(),
  },
}));

import { useMyTickets } from "./use-tickets";
import { profileApi } from "@/lib/api/profile";

describe("マイチケット hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useMyTickets: マイチケット一覧取得", () => {
    it("profileApi.getMyTickets が呼ばれ、データが返る", async () => {
      const tickets = [
        {
          id: "p1",
          event: {
            id: "e1",
            title: "イベントA",
            startAt: "2026-07-01T10:00:00Z",
            endAt: "2026-07-01T12:00:00Z",
            status: "published",
            venueName: "会場A",
            locationType: "offline",
          },
          ticket: { id: "t1", ticketName: "一般", price: 1000, currency: "JPY" },
          quantity: 1,
          status: "applied",
          paymentStatus: null,
          appliedAt: "2026-06-01T00:00:00Z",
        },
      ];
      vi.mocked(profileApi.getMyTickets).mockResolvedValue(tickets);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMyTickets(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(tickets);
      expect(profileApi.getMyTickets).toHaveBeenCalled();
    });
  });
});
