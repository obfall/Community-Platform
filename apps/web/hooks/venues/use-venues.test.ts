import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createHookWrapper } from "@/test/test-utils";

const { apiMock, toastMock } = vi.hoisted(() => ({
  apiMock: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    createSpace: vi.fn(),
    getReservations: vi.fn(),
    getVenueReservations: vi.fn(),
    createReservation: vi.fn(),
    cancelReservation: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/venues", () => ({
  venuesApi: apiMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  useVenues,
  useVenue,
  useCreateVenue,
  useCreateSpace,
  useDeleteVenue,
  useReservations,
  useVenueReservations,
  useCreateReservation,
  useCancelReservation,
} from "./use-venues";

describe("venues hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // useVenues / useVenue: 取得系
  // ============================================================================
  describe("useVenues: 施設一覧取得", () => {
    it("params 付きで venuesApi.getAll が呼ばれ、データが返る", async () => {
      const payload = [{ id: "v-1", name: "Venue1" }];
      apiMock.getAll.mockResolvedValue(payload);

      const { wrapper } = createHookWrapper();
      const { result } = renderHook(
        () => useVenues({ publishStatus: "published", search: "会議" }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getAll).toHaveBeenCalledWith({ publishStatus: "published", search: "会議" });
      expect(result.current.data).toBe(payload);
    });
  });

  describe("useVenue: 単件取得", () => {
    it("id が指定されたとき getOne が呼ばれる", async () => {
      apiMock.getOne.mockResolvedValue({ id: "v-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useVenue("v-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getOne).toHaveBeenCalledWith("v-1");
    });

    it("id が undefined なら fetch されない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useVenue(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getOne).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // useCreateVenue / useDeleteVenue
  // ============================================================================
  describe("useCreateVenue: 施設登録", () => {
    it("成功時 create が呼ばれ、成功 toast が表示される", async () => {
      apiMock.create.mockResolvedValue({ id: "v-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateVenue(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: "新規会場" });
      });

      expect(apiMock.create).toHaveBeenCalledWith({ name: "新規会場" });
      expect(toastMock.success).toHaveBeenCalled();
    });

    it("失敗時 mutation はエラーで reject する（エラートーストは providers.tsx に集約）", async () => {
      apiMock.create.mockRejectedValue(new Error("boom"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateVenue(), { wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync({ name: "x" })).rejects.toThrow();
      });

      expect(toastMock.success).not.toHaveBeenCalled();
      // toast.error は hook 内では呼ばない（MutationCache.onError で一元処理する規約）
      expect(toastMock.error).not.toHaveBeenCalled();
    });
  });

  describe("useDeleteVenue: 削除", () => {
    it("remove に id が渡され、成功 toast が表示される", async () => {
      apiMock.remove.mockResolvedValue(undefined);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useDeleteVenue(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("v-1");
      });

      expect(apiMock.remove).toHaveBeenCalledWith("v-1");
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // useCreateSpace
  // ============================================================================
  describe("useCreateSpace: スペース登録", () => {
    it("venueId と data を渡し、成功 toast が表示される", async () => {
      apiMock.createSpace.mockResolvedValue({ id: "sp-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateSpace(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          venueId: "v-1",
          data: { name: "会議室A", capacity: 10 },
        });
      });

      expect(apiMock.createSpace).toHaveBeenCalledWith("v-1", {
        name: "会議室A",
        capacity: 10,
      });
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // useReservations / useVenueReservations
  // ============================================================================
  describe("useReservations: スペース内予約一覧 enabled 制御", () => {
    it("spaceId 未指定なら getReservations は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useReservations(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getReservations).not.toHaveBeenCalled();
    });

    it("spaceId 指定で getReservations が呼ばれる", async () => {
      apiMock.getReservations.mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useReservations("sp-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getReservations).toHaveBeenCalledWith("sp-1");
    });
  });

  describe("useVenueReservations: 施設内予約一覧 enabled 制御", () => {
    it("venueId 未指定なら getVenueReservations は呼ばれない", async () => {
      const { wrapper } = createHookWrapper();
      renderHook(() => useVenueReservations(undefined), { wrapper });

      await new Promise((r) => setTimeout(r, 30));
      expect(apiMock.getVenueReservations).not.toHaveBeenCalled();
    });

    it("venueId 指定で getVenueReservations が呼ばれる", async () => {
      apiMock.getVenueReservations.mockResolvedValue([]);
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useVenueReservations("v-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiMock.getVenueReservations).toHaveBeenCalledWith("v-1");
    });
  });

  // ============================================================================
  // useCreateReservation / useCancelReservation
  // ============================================================================
  describe("useCreateReservation: 予約作成", () => {
    it("spaceId と data を渡し、成功 toast が表示される", async () => {
      apiMock.createReservation.mockResolvedValue({ id: "r-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateReservation(), { wrapper });

      const data = {
        title: "打ち合わせ",
        startAt: "2026-06-01T10:00:00Z",
        endAt: "2026-06-01T11:00:00Z",
      };
      await act(async () => {
        await result.current.mutateAsync({ spaceId: "sp-1", data });
      });

      expect(apiMock.createReservation).toHaveBeenCalledWith("sp-1", data);
      expect(toastMock.success).toHaveBeenCalled();
    });

    it("失敗時 mutation はエラーで reject し、success toast は表示しない", async () => {
      apiMock.createReservation.mockRejectedValue(new Error("conflict"));
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCreateReservation(), { wrapper });

      await act(async () => {
        await expect(
          result.current.mutateAsync({
            spaceId: "sp-1",
            data: { startAt: "2026-06-01T10:00:00Z", endAt: "2026-06-01T11:00:00Z" },
          }),
        ).rejects.toThrow();
      });

      expect(toastMock.success).not.toHaveBeenCalled();
      expect(toastMock.error).not.toHaveBeenCalled();
    });
  });

  describe("useCancelReservation: 予約キャンセル", () => {
    it("reservationId を渡し、成功 toast が表示される", async () => {
      apiMock.cancelReservation.mockResolvedValue({ id: "r-1" });
      const { wrapper } = createHookWrapper();
      const { result } = renderHook(() => useCancelReservation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("r-1");
      });

      expect(apiMock.cancelReservation).toHaveBeenCalledWith("r-1");
      expect(toastMock.success).toHaveBeenCalled();
    });
  });
});
