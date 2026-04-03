import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import type { UpdateAppSettingInput } from "@/lib/api/types";
import { toast } from "sonner";

export function useAppSettings() {
  return useQuery({
    queryKey: ["settings", "app"],
    queryFn: () => settingsApi.getAppSettings(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateAppSettingInput }) =>
      settingsApi.updateAppSetting(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "app"] });
      toast.success("設定を更新しました");
    },
    onError: () => {
      toast.error("設定の更新に失敗しました");
    },
  });
}
