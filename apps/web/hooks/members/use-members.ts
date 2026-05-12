import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { usersApi } from "@/lib/api/members";
import { chatApi } from "@/lib/api/chat";
import type { UserListQuery } from "@/lib/api/types";

export function useMembers(params?: UserListQuery) {
  return useQuery({
    queryKey: ["members", params],
    queryFn: () => usersApi.getUsers(params),
    staleTime: 60 * 1000,
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ["members", id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMemberEvents(id: string | undefined) {
  return useQuery({
    queryKey: ["members", id, "events"],
    queryFn: () => usersApi.getUserEvents(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useMemberProjects(id: string | undefined) {
  return useQuery({
    queryKey: ["members", id, "projects"],
    queryFn: () => usersApi.getUserProjects(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useStartDm() {
  const router = useRouter();
  const t = useTranslations("members.detail");
  return useMutation({
    mutationFn: (targetUserId: string) =>
      chatApi.createRoom({ type: "dm", memberIds: [targetUserId] }),
    onSuccess: (room) => {
      router.push(`/chat?room=${room.id}`);
    },
    onError: () => toast.error(t("chatStartFailed")),
  });
}
