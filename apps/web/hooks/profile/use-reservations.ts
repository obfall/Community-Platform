import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { profileApi, fetchAllPaginated } from "@/lib/api/profile";

// status を指定するとそのステータスのみ取得。未指定は全件（ステータス順→開始日時順）。
export function useMyReservations(status?: string) {
  return useInfiniteQuery({
    queryKey: ["my", "reservations", { status: status ?? null }],
    queryFn: ({ pageParam }) => profileApi.getMyReservations({ page: pageParam, status }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    staleTime: 60 * 1000,
  });
}

// カレンダー等、全件をフラット配列で必要とする箇所向け（全ページ取得）。
export function useAllMyReservations() {
  return useQuery({
    queryKey: ["my", "reservations", "all"],
    queryFn: () => fetchAllPaginated((page) => profileApi.getMyReservations({ page, limit: 100 })),
    staleTime: 60 * 1000,
  });
}
