import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";

export function useMyTickets() {
  return useQuery({
    queryKey: ["my", "tickets"],
    queryFn: () => profileApi.getMyTickets(),
    staleTime: 60 * 1000,
  });
}
