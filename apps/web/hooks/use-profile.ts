import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";
import type { UpdateProfileInput, UpdatePublicInfoInput } from "@/lib/api/types";
import { toast } from "sonner";

export function useMyProfile() {
  return useQuery({
    queryKey: ["users", "me", "profile"],
    queryFn: () => usersApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileInput) => usersApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
      toast.success("プロフィールを更新しました");
    },
    onError: () => {
      toast.error("プロフィールの更新に失敗しました");
    },
  });
}

export function useUpdatePublicInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePublicInfoInput) => usersApi.updatePublicInfo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
      toast.success("公開情報を更新しました");
    },
    onError: () => {
      toast.error("公開情報の更新に失敗しました");
    },
  });
}
