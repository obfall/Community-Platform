import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contentsApi } from "@/lib/api/content";

export function useContents(query?: {
  page?: number;
  limit?: number;
  search?: string;
  contentType?: string;
  publishStatus?: string;
}) {
  return useQuery({
    queryKey: ["contents", query],
    queryFn: () => contentsApi.getAll(query),
  });
}

export function useContent(id: string | undefined) {
  return useQuery({
    queryKey: ["contents", id],
    queryFn: () => contentsApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.success("コンテンツを作成しました");
    },
    onError: () => toast.error("コンテンツ作成に失敗しました"),
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      contentsApi.update(id, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({ queryKey: ["contents", vars.id] });
      toast.success("コンテンツを更新しました");
    },
    onError: () => toast.error("コンテンツ更新に失敗しました"),
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.success("コンテンツを削除しました");
    },
    onError: () => toast.error("コンテンツ削除に失敗しました"),
  });
}
