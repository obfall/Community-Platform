import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { profileApi } from "@/lib/api/profile";

export function useMyLibrary() {
  return useQuery({
    queryKey: ["my", "library"],
    queryFn: () => profileApi.getLibrary(),
    staleTime: 60 * 1000,
  });
}

export function useCreateLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof profileApi.createLibraryItem>[0]) =>
      profileApi.createLibraryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my", "library"] });
      toast.success("ライブラリーに追加しました");
    },
    onError: () => toast.error("追加に失敗しました"),
  });
}

export function useUpdateLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof profileApi.updateLibraryItem>[1];
    }) => profileApi.updateLibraryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my", "library"] });
      toast.success("更新しました");
    },
    onError: () => toast.error("更新に失敗しました"),
  });
}

export function useDeleteLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => profileApi.deleteLibraryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my", "library"] });
      toast.success("削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });
}
