import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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

export function useMyTickets() {
  return useQuery({
    queryKey: ["my", "tickets"],
    queryFn: () => usersApi.getMyTickets(),
    staleTime: 60 * 1000,
  });
}

export function useMyReservations() {
  return useQuery({
    queryKey: ["my", "reservations"],
    queryFn: () => usersApi.getMyReservations(),
    staleTime: 60 * 1000,
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: ["my", "tasks"],
    queryFn: () => usersApi.getMyTasks(),
    staleTime: 60 * 1000,
  });
}

export function useMyLibrary() {
  return useQuery({
    queryKey: ["my", "library"],
    queryFn: () => usersApi.getLibrary(),
    staleTime: 60 * 1000,
  });
}

export function useCreateLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof usersApi.createLibraryItem>[0]) =>
      usersApi.createLibraryItem(data),
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
      data: Parameters<typeof usersApi.updateLibraryItem>[1];
    }) => usersApi.updateLibraryItem(id, data),
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
    mutationFn: (id: string) => usersApi.deleteLibraryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my", "library"] });
      toast.success("削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });
}

export function useStartDm() {
  const router = useRouter();
  return useMutation({
    mutationFn: (targetUserId: string) =>
      chatApi.createRoom({ type: "dm", memberIds: [targetUserId] }),
    onSuccess: (room) => {
      router.push(`/chat?room=${room.id}`);
    },
    onError: () => toast.error("チャットの開始に失敗しました"),
  });
}
