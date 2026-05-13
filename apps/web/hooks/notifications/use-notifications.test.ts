import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/notifications", () => ({
  notificationsApi: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

import { useNotifications, useUnreadCount, useMarkAsRead } from "./use-notifications";
import { notificationsApi } from "@/lib/api/notifications";

describe("notifications hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useNotifications: 通知一覧取得", () => {
    it("query を渡して getNotifications が呼ばれ、データが返る", async () => {
      const mockData = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockData);

      const query = {
        page: 1,
        limit: 100,
        type: "announcement,event_announcement",
        unreadOnly: true,
      };
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useNotifications(query), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(notificationsApi.getNotifications).toHaveBeenCalledWith(query);
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe("useUnreadCount: 未読数取得", () => {
    it("getUnreadCount が呼ばれ、件数が返る", async () => {
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({ count: 3 });

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUnreadCount(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ count: 3 });
    });
  });

  describe("useMarkAsRead: 既読化", () => {
    it("mutate(id) で markAsRead が呼ばれ、成功時に notifications クエリが invalidate される", async () => {
      vi.mocked(notificationsApi.markAsRead).mockResolvedValue(undefined as never);

      const { wrapper, queryClient } = createHookWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("notif-1");
      });

      expect(notificationsApi.markAsRead).toHaveBeenCalledWith("notif-1");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications"] });
    });
  });
});
