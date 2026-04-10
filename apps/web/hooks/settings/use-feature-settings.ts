import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import type { ToggleFeatureInput } from "@/lib/api/types";
import { toast } from "sonner";

export function useToggleFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ featureKey, data }: { featureKey: string; data: ToggleFeatureInput }) =>
      settingsApi.toggleFeature(featureKey, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "features"] });
      toast.success(variables.data.isEnabled ? "機能を有効にしました" : "機能を無効にしました");
    },
    onError: () => {
      toast.error("機能の切替に失敗しました");
    },
  });
}
