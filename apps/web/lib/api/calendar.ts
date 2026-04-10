import { apiClient } from "./client";
import type { Schedule } from "./types";

export interface ScheduleInput {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  location?: string;
  visibility?: string;
}

export const schedulesApi = {
  getAll: (params?: { startAt?: string; endAt?: string }) =>
    apiClient.get<Schedule[]>("/schedules", { params }).then((r) => r.data),

  create: (data: ScheduleInput) => apiClient.post<Schedule>("/schedules", data).then((r) => r.data),

  update: (id: string, data: Partial<ScheduleInput>) =>
    apiClient.patch<Schedule>(`/schedules/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/schedules/${id}`),
};
