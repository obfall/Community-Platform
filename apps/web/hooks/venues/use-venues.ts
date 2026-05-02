import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { venuesApi } from "@/lib/api/venues";

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
  return useMutation({
    mutationFn: venuesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success("施設を登録しました");
    },
    onError: () => toast.error("施設登録に失敗しました"),
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
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
      toast.success("スペースを登録しました");
    },
    onError: () => toast.error("スペース登録に失敗しました"),
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => venuesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success("施設を削除しました");
    },
    onError: () => toast.error("施設削除に失敗しました"),
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
      toast.success("予約を登録しました");
    },
    onError: () => toast.error("予約登録に失敗しました"),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => venuesApi.cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["venue-reservations"] });
      toast.success("予約をキャンセルしました");
    },
    onError: () => toast.error("予約キャンセルに失敗しました"),
  });
}
