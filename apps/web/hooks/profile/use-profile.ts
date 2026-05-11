import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";
import type { UpdateProfileInput, UpdatePublicInfoInput } from "@/lib/api/types";
import { toast } from "sonner";

export function useMyProfile() {
  return useQuery({
    queryKey: ["users", "me", "profile"],
    queryFn: () => profileApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });
}

// Phase 11.3 規約: API エラーのトーストはグローバル QueryCache.onError に任せる。
// 個別 onError + toast.error を書くと二重表示になるため書かない。
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileInput) => profileApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
      toast.success("プロフィールを更新しました");
    },
  });
}

export function useUpdatePublicInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePublicInfoInput) => profileApi.updatePublicInfo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
      toast.success("公開情報を更新しました");
    },
  });
}
