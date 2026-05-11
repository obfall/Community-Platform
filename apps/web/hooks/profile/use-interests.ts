import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { profileApi } from "@/lib/api/profile";

export function useInterestCategories() {
  return useQuery({
    queryKey: ["interest-categories"],
    queryFn: () => profileApi.getInterestCategories(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useReplaceInterests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryIds: string[]) => profileApi.replaceInterests(categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
      toast.success("興味分野を更新しました");
    },
    onError: () => toast.error("興味分野の更新に失敗しました"),
  });
}
