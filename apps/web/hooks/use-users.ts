import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";
import type { UserListQuery } from "@/lib/api/types";

export function useUsers(params?: UserListQuery) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.getUsers(params),
    staleTime: 60 * 1000,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
