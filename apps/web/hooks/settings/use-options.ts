import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api/settings";

export function useOptions() {
  return useQuery({
    queryKey: ["settings", "options"],
    queryFn: () => settingsApi.getOptions(),
    staleTime: 60 * 1000,
  });
}

export function useToggleOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureKey, isAvailable }: { featureKey: string; isAvailable: boolean }) =>
      settingsApi.toggleOption(featureKey, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "options"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "features"] });
      toast.success("オプション機能を更新しました");
    },
    onError: () => toast.error("オプション機能の更新に失敗しました"),
  });
}
