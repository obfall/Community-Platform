import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orientationApi, type OrientationPageInput } from "@/lib/api/orientation";

export function useOrientationPages() {
  return useQuery({
    queryKey: ["orientation", "pages"],
    queryFn: () => orientationApi.getPages(),
  });
}

export function useOrientationPage(id: string | undefined) {
  return useQuery({
    queryKey: ["orientation", "pages", id],
    queryFn: () => orientationApi.getPage(id!),
    enabled: !!id,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OrientationPageInput) => orientationApi.createPage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orientation", "pages"] });
      toast.success("ページを作成しました");
    },
    onError: () => toast.error("ページの作成に失敗しました"),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrientationPageInput> }) =>
      orientationApi.updatePage(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["orientation", "pages"] });
      qc.invalidateQueries({ queryKey: ["orientation", "pages", vars.id] });
      toast.success("ページを更新しました");
    },
    onError: () => toast.error("ページの更新に失敗しました"),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orientationApi.deletePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orientation", "pages"] });
      toast.success("ページを削除しました");
    },
    onError: () => toast.error("ページの削除に失敗しました"),
  });
}

export function useCompleteOrientation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => orientationApi.complete(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orientation", "me"] });
      toast.success("オリエンテーションを完了しました");
    },
    onError: () => toast.error("完了処理に失敗しました"),
  });
}

export function useMyCompletion() {
  return useQuery({
    queryKey: ["orientation", "me"],
    queryFn: () => orientationApi.getMyCompletion(),
  });
}
