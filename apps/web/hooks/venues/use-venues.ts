import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { venuesApi } from "@/lib/api/venues";

// onError は providers.tsx の MutationCache.onError に集約しているため、
// 各 mutation には onError を書かない（Phase 11.3 エラーハンドリング規約）。

export function useVenues(params?: { publishStatus?: string; search?: string }) {
  return useQuery({
    queryKey: ["venues", params],
    queryFn: () => venuesApi.getAll(params),
  });
}

export function useVenue(id: string | undefined) {
  return useQuery({
    queryKey: ["venues", id],
    queryFn: () => venuesApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  const t = useTranslations("venues.toast");
  return useMutation({
    mutationFn: (data: Parameters<typeof venuesApi.create>[0]) => venuesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success(t("venueCreated"));
    },
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  const t = useTranslations("venues.toast");
  return useMutation({
    mutationFn: ({
      venueId,
      data,
    }: {
      venueId: string;
      data: { name: string; description?: string; capacity?: number; spaceTypes?: string[] };
    }) => venuesApi.createSpace(venueId, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["venues", vars.venueId] });
      toast.success(t("spaceCreated"));
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  const t = useTranslations("venues.toast");
  return useMutation({
    mutationFn: (id: string) => venuesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success(t("venueDeleted"));
    },
  });
}

export function useReservations(spaceId: string | undefined) {
  return useQuery({
    queryKey: ["reservations", spaceId],
    queryFn: () => venuesApi.getReservations(spaceId!),
    enabled: !!spaceId,
  });
}

export function useVenueReservations(venueId: string | undefined) {
  return useQuery({
    queryKey: ["venue-reservations", venueId],
    queryFn: () => venuesApi.getVenueReservations(venueId!),
    enabled: !!venueId,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  const t = useTranslations("venues.toast");
  return useMutation({
    mutationFn: ({
      spaceId,
      data,
    }: {
      spaceId: string;
      data: { title?: string; startAt: string; endAt: string; note?: string };
    }) => venuesApi.createReservation(spaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["venue-reservations"] });
      toast.success(t("reservationCreated"));
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  const t = useTranslations("venues.toast");
  return useMutation({
    mutationFn: (reservationId: string) => venuesApi.cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["venue-reservations"] });
      toast.success(t("reservationCanceled"));
    },
  });
}
