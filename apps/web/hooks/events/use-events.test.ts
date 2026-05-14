import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

vi.mock("@/lib/api/events", () => ({
  eventsApi: {
    getEvents: vi.fn(),
    getEvent: vi.fn(),
    getCalendarEvents: vi.fn(),
    getUpcomingEvents: vi.fn(),
    getMyUpcomingEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    participate: vi.fn(),
    cancelParticipation: vi.fn(),
    duplicateEvent: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import {
  useEvents,
  useEvent,
  useCalendarEvents,
  useUpcomingEvents,
  useMyUpcomingEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useParticipate,
  useCancelParticipation,
  useDuplicateEvent,
} from "./use-events";
import { eventsApi } from "@/lib/api/events";
import { toast } from "sonner";

describe("events hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useEvents: イベント一覧取得", () => {
    it("query 未指定なら eventsApi.getEvents が undefined で呼ばれる", async () => {
      vi.mocked(eventsApi.getEvents).mockResolvedValue({ data: [], meta: {} } as never);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useEvents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(eventsApi.getEvents).toHaveBeenCalledWith(undefined);
    });

    it("status クエリを渡すと API にそのまま渡される（admin が draft を絞り込むケース）", async () => {
      vi.mocked(eventsApi.getEvents).mockResolvedValue({ data: [], meta: {} } as never);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useEvents({ status: "draft", page: 1, limit: 20 }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(eventsApi.getEvents).toHaveBeenCalledWith({ status: "draft", page: 1, limit: 20 });
    });
  });

  describe("useEvent: イベント詳細取得", () => {
    it("id が undefined のときは fetch されない（enabled: !!id）", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useEvent(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 50));
      expect(eventsApi.getEvent).not.toHaveBeenCalled();
    });

    it("id 指定で eventsApi.getEvent が呼ばれる", async () => {
      vi.mocked(eventsApi.getEvent).mockResolvedValue({ id: "e1" } as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useEvent("e1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(eventsApi.getEvent).toHaveBeenCalledWith("e1");
    });
  });

  describe("useCalendarEvents: カレンダー用一覧", () => {
    it("from / to が両方揃わなければ fetch されない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useCalendarEvents("", "2026-12-31"), { wrapper });

      await new Promise((r) => setTimeout(r, 50));
      expect(eventsApi.getCalendarEvents).not.toHaveBeenCalled();
    });

    it("from / to が揃えば API が呼ばれる", async () => {
      vi.mocked(eventsApi.getCalendarEvents).mockResolvedValue([] as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCalendarEvents("2026-01-01", "2026-12-31"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(eventsApi.getCalendarEvents).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
    });
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

  describe("useCreateEvent: 作成", () => {
    it("成功時に api.createEvent が呼ばれ、成功トーストが出る", async () => {
      vi.mocked(eventsApi.createEvent).mockResolvedValue({ id: "new" } as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateEvent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          title: "新規",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
        } as never);
      });

      expect(eventsApi.createEvent).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("イベントを作成しました");
    });

    it("失敗時にエラートーストが出る", async () => {
      vi.mocked(eventsApi.createEvent).mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateEvent(), { wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync({ title: "x" } as never)).rejects.toThrow();
      });

      expect(toast.error).toHaveBeenCalledWith("イベントの作成に失敗しました");
    });
  });

  describe("useUpdateEvent: 更新", () => {
    it("id と data を組で渡し、api.updateEvent に展開される", async () => {
      vi.mocked(eventsApi.updateEvent).mockResolvedValue({ id: "e1" } as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useUpdateEvent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "e1", data: { title: "new" } as never });
      });

      expect(eventsApi.updateEvent).toHaveBeenCalledWith("e1", { title: "new" });
      expect(toast.success).toHaveBeenCalledWith("イベントを更新しました");
    });
  });

  describe("useDeleteEvent: 削除", () => {
    it("id を渡して api.deleteEvent が呼ばれる", async () => {
      vi.mocked(eventsApi.deleteEvent).mockResolvedValue(undefined as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteEvent(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("e1");
      });

      expect(eventsApi.deleteEvent).toHaveBeenCalledWith("e1");
      expect(toast.success).toHaveBeenCalledWith("イベントを削除しました");
    });
  });

  describe("useParticipate: 参加申込", () => {
    it("成功時に api.participate が呼ばれる", async () => {
      vi.mocked(eventsApi.participate).mockResolvedValue({ id: "p1" } as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useParticipate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          eventId: "e1",
          data: { ticketId: "t1" } as never,
        });
      });

      expect(eventsApi.participate).toHaveBeenCalledWith("e1", { ticketId: "t1" });
      expect(toast.success).toHaveBeenCalledWith("参加申込しました");
    });

    it("API エラー（response.data.message が文字列）の場合はその文字列をトースト表示する", async () => {
      vi.mocked(eventsApi.participate).mockRejectedValue({
        response: { data: { message: "定員に達しています" } },
      });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useParticipate(), { wrapper });

      await act(async () => {
        await expect(
          result.current.mutateAsync({ eventId: "e1", data: undefined }),
        ).rejects.toBeDefined();
      });

      expect(toast.error).toHaveBeenCalledWith("定員に達しています");
    });

    it("API エラーで message が配列なら join してトースト表示する", async () => {
      vi.mocked(eventsApi.participate).mockRejectedValue({
        response: { data: { message: ["氏名は必須です", "ふりがなは必須です"] } },
      });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useParticipate(), { wrapper });

      await act(async () => {
        await expect(
          result.current.mutateAsync({ eventId: "e1", data: undefined }),
        ).rejects.toBeDefined();
      });

      expect(toast.error).toHaveBeenCalledWith("氏名は必須です, ふりがなは必須です");
    });

    it("API エラーで message が無いときはデフォルト文言にフォールバックする", async () => {
      vi.mocked(eventsApi.participate).mockRejectedValue({ response: { data: {} } });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useParticipate(), { wrapper });

      await act(async () => {
        await expect(
          result.current.mutateAsync({ eventId: "e1", data: undefined }),
        ).rejects.toBeDefined();
      });

      expect(toast.error).toHaveBeenCalledWith("参加申込に失敗しました");
    });
  });

  describe("useCancelParticipation: 参加キャンセル", () => {
    it("eventId を渡して api.cancelParticipation が呼ばれる", async () => {
      vi.mocked(eventsApi.cancelParticipation).mockResolvedValue(undefined as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCancelParticipation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("e1");
      });

      expect(eventsApi.cancelParticipation).toHaveBeenCalledWith("e1");
      expect(toast.success).toHaveBeenCalledWith("参加をキャンセルしました");
    });
  });

  describe("useDuplicateEvent: 複製", () => {
    it("成功時に api.duplicateEvent が呼ばれて成功トースト", async () => {
      vi.mocked(eventsApi.duplicateEvent).mockResolvedValue({ id: "new" } as never);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDuplicateEvent(), { wrapper });

      await act(async () => {
        const res = await result.current.mutateAsync("e1");
        expect(res).toEqual({ id: "new" });
      });

      expect(eventsApi.duplicateEvent).toHaveBeenCalledWith("e1");
      expect(toast.success).toHaveBeenCalledWith("イベントを複製しました");
    });

    it("失敗時にエラートーストが出る", async () => {
      vi.mocked(eventsApi.duplicateEvent).mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDuplicateEvent(), { wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync("e1")).rejects.toThrow();
      });

      expect(toast.error).toHaveBeenCalledWith("イベントの複製に失敗しました");
    });
  });
});
