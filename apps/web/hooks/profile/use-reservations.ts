import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";

export function useMyReservations() {
  return useQuery({
    queryKey: ["my", "reservations"],
    queryFn: () => profileApi.getMyReservations(),
    staleTime: 60 * 1000,
  });
}
