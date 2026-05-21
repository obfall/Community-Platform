import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";

export function useMyProjectSchedules() {
  return useQuery({
    queryKey: ["my", "project-schedules"],
    queryFn: () => profileApi.getMyProjectSchedules(),
    staleTime: 60 * 1000,
  });
}
