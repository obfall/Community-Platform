import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { usageHistoryApi } from "@/lib/api/usage-history";
import type { LoginHistoryQuery } from "@/lib/api/types";

export function useLoginHistories(params?: LoginHistoryQuery) {
  return useQuery({
    queryKey: ["usage-history", "logins", params],
    queryFn: () => usageHistoryApi.listLoginHistories(params),
    staleTime: 30 * 1000,
  });
}

export function useExportLoginHistories() {
  return useMutation({
    mutationFn: (params?: LoginHistoryQuery) => usageHistoryApi.exportLoginHistories(params),
    onSuccess: (data) => {
      const blob = new Blob([data as BlobPart], { type: "text/csv; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0]!.replace(/-/g, "");
      a.download = `login-histories_${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ログイン履歴を CSV でダウンロードしました");
    },
    onError: () => toast.error("CSV エクスポートに失敗しました"),
  });
}
