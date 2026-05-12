import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";

export function useMyTasks() {
  return useQuery({
    queryKey: ["my", "tasks"],
    queryFn: () => profileApi.getMyTasks(),
    staleTime: 60 * 1000,
  });
}
