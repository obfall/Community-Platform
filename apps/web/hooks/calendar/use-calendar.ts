import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { schedulesApi, type ScheduleInput } from "@/lib/api/calendar";

export function useSchedules(query?: { startAt?: string; endAt?: string }) {
  return useQuery({
    queryKey: ["schedules", query],
    queryFn: () => schedulesApi.getAll(query),
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleInput) => schedulesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("スケジュールを作成しました");
    },
    onError: () => toast.error("スケジュールの作成に失敗しました"),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleInput> }) =>
      schedulesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("スケジュールを更新しました");
    },
    onError: () => toast.error("スケジュールの更新に失敗しました"),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("スケジュールを削除しました");
    },
    onError: () => toast.error("スケジュールの削除に失敗しました"),
  });
}
