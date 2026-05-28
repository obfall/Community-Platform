import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsApi } from "@/lib/api/settings";

// エラートーストはグローバルの MutationCache.onError 任せ（Phase 11.3 規約）。

export function usePermissions(featureKey?: string) {
  return useQuery({
    queryKey: ["settings", "permissions", featureKey ?? "all"],
    queryFn: () => settingsApi.getPermissions(featureKey),
    staleTime: 60 * 1000,
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allowedRoles }: { id: string; allowedRoles: string[] }) =>
      settingsApi.updatePermission(id, allowedRoles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "permissions"] });
      toast.success("権限設定を更新しました");
    },
  });
}
