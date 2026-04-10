import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { memosApi, type MemoInput } from "@/lib/api/memo";

export function useMemos(query?: { categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: ["memos", query],
    queryFn: () => memosApi.getAll(query),
  });
}

export function useMemoDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["memos", id],
    queryFn: () => memosApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MemoInput) => memosApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memos"] });
      toast.success("メモを作成しました");
    },
    onError: () => toast.error("メモの作成に失敗しました"),
  });
}

export function useUpdateMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MemoInput> }) =>
      memosApi.update(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["memos"] });
      qc.invalidateQueries({ queryKey: ["memos", vars.id] });
      toast.success("メモを更新しました");
    },
    onError: () => toast.error("メモの更新に失敗しました"),
  });
}

export function useDeleteMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memos"] });
      toast.success("メモを削除しました");
    },
    onError: () => toast.error("メモの削除に失敗しました"),
  });
}

export function useMemoCategories() {
  return useQuery({
    queryKey: ["memos", "categories"],
    queryFn: () => memosApi.getCategories(),
  });
}

export function useCreateMemoCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => memosApi.createCategory(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memos", "categories"] });
      toast.success("カテゴリを作成しました");
    },
    onError: () => toast.error("カテゴリの作成に失敗しました"),
  });
}

export function useDeleteMemoCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memosApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memos", "categories"] });
      toast.success("カテゴリを削除しました");
    },
    onError: () => toast.error("カテゴリの削除に失敗しました"),
  });
}
