import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import type { CreatePermissionInput, UpdatePermissionInput } from "@/lib/api/types";
import { toast } from "sonner";

export function usePermissions(featureKey?: string) {
  return useQuery({
    queryKey: ["settings", "permissions", featureKey ?? "all"],
    queryFn: () => settingsApi.getPermissions(featureKey),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePermissionInput) => settingsApi.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "permissions"] });
      toast.success("権限設定を作成しました");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? "権限設定の作成に失敗しました";
      toast.error(Array.isArray(message) ? message[0] : message);
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionInput }) =>
      settingsApi.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "permissions"] });
      toast.success("権限設定を更新しました");
    },
    onError: () => {
      toast.error("権限設定の更新に失敗しました");
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => settingsApi.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "permissions"] });
      toast.success("権限設定を削除しました");
    },
    onError: () => {
      toast.error("権限設定の削除に失敗しました");
    },
  });
}
