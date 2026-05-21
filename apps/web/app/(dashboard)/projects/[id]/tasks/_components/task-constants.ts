import type { VideoTaskStatus } from "@/lib/api/types";

/**
 * タスクステータスの enum 値（実体は VideoTaskStatus と同一）。
 * ラベル文字列は i18n（enums.videoTaskStatus）に集約しているのでここからは出さない。
 */
export const TASK_STATUS_VALUES: VideoTaskStatus[] = ["not_started", "in_progress", "completed"];

export function statusBadgeVariant(status: VideoTaskStatus): "outline" | "secondary" | "default" {
  if (status === "completed") return "default";
  if (status === "in_progress") return "secondary";
  return "outline";
}
