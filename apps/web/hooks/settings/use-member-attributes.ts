import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { memberAttributesApi } from "@/lib/api/member-attributes";
import { usersApi } from "@/lib/api/members";
import type {
  CreateMemberAttributeInput,
  UpdateMemberAttributeInput,
  SetAttributeValueItem,
} from "@/lib/api/types";

export function useMemberAttributes() {
  return useQuery({
    queryKey: ["member-attributes"],
    queryFn: () => memberAttributesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMemberAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMemberAttributeInput) => memberAttributesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-attributes"] });
      toast.success("属性を作成しました");
    },
    onError: () => toast.error("属性の作成に失敗しました"),
  });
}

export function useUpdateMemberAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMemberAttributeInput }) =>
      memberAttributesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-attributes"] });
      toast.success("属性を更新しました");
    },
    onError: () => toast.error("属性の更新に失敗しました"),
  });
}

export function useDeleteMemberAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memberAttributesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-attributes"] });
      toast.success("属性を削除しました");
    },
    onError: () => toast.error("属性の削除に失敗しました"),
  });
}

export function useMyAttributes() {
  return useQuery({
    queryKey: ["users", "me", "attributes"],
    queryFn: () => usersApi.getMyAttributes(),
    staleTime: 60 * 1000,
  });
}

export function useSetMyAttributes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SetAttributeValueItem[]) => usersApi.setMyAttributes(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "attributes"] });
      toast.success("カスタム属性を保存しました");
    },
    onError: () => toast.error("カスタム属性の保存に失敗しました"),
  });
}
