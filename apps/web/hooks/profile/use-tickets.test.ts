import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/profile", () => ({
  profileApi: {
    getMyTickets: vi.fn(),
  },
  fetchAllPaginated: vi.fn(),
}));

import { useMyTickets } from "./use-tickets";
import { profileApi } from "@/lib/api/profile";

describe("マイチケット hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useMyTickets: マイチケット一覧取得（ページング）", () => {
    it("profileApi.getMyTickets が page 指定で呼ばれ、1ページ目のデータが返る", async () => {
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
      vi.mocked(profileApi.getMyTickets).mockResolvedValue({
        data: tickets,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMyTickets(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages[0]?.data).toEqual(tickets);
      expect(result.current.hasNextPage).toBe(false);
      expect(profileApi.getMyTickets).toHaveBeenCalledWith({ page: 1, status: undefined });
    });

    it("status を渡すとフィルタ値が API に伝わる", async () => {
      vi.mocked(profileApi.getMyTickets).mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useMyTickets("attended"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(profileApi.getMyTickets).toHaveBeenCalledWith({ page: 1, status: "attended" });
    });
  });
});
