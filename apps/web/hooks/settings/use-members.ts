import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersApi } from "@/lib/api/members";
import type { UserListQuery, SetAttributeValueItem } from "@/lib/api/types";

export function useUsers(params?: UserListQuery) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.getUsers(params),
    staleTime: 60 * 1000,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("ロールを変更しました");
    },
    onError: () => toast.error("ロールの変更に失敗しました"),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      usersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("ステータスを変更しました");
    },
    onError: () => toast.error("ステータスの変更に失敗しました"),
  });
}

export function useForcePasswordReset() {
  return useMutation({
    mutationFn: (id: string) => usersApi.forcePasswordReset(id),
    onSuccess: () => toast.success("パスワードリセットメールを送信しました"),
    onError: () => toast.error("パスワードリセットに失敗しました"),
  });
}

export function useUpdateUserEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => usersApi.updateEmail(id, email),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      toast.success("メールアドレスを変更しました");
    },
    onError: (err) => {
      const message =
        err instanceof Error && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            "メールアドレスの変更に失敗しました")
          : "メールアドレスの変更に失敗しました";
      toast.error(message);
    },
  });
}

export function useUserAttributes(userId: string | undefined) {
  return useQuery({
    queryKey: ["users", userId, "attributes"],
    queryFn: () => usersApi.getUserAttributes(userId!),
    enabled: !!userId,
  });
}

export function useSetUserAttributes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: SetAttributeValueItem[] }) =>
      usersApi.setUserAttributes(userId, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId, "attributes"] });
      toast.success("属性値を保存しました");
    },
    onError: () => toast.error("属性値の保存に失敗しました"),
  });
}

export function useExportMembersCsv() {
  return useMutation({
    mutationFn: () => usersApi.exportCsv(),
    onSuccess: (data) => {
      const blob = new Blob([data as BlobPart], { type: "text/csv; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0]!.replace(/-/g, "");
      a.download = `members_${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSVをエクスポートしました");
    },
    onError: () => toast.error("CSVエクスポートに失敗しました"),
  });
}
