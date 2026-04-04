import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";

export function useFeatures() {
  return useQuery({
    queryKey: ["settings", "features"],
    queryFn: () => settingsApi.getFeatures(),
    staleTime: 5 * 60 * 1000,
  });
}
