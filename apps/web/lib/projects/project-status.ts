/**
 * プロジェクトステータス関連の表示定数。
 * イベントステータス（lib/events/event-status.ts）と意味付けを揃えている:
 *   - not_started: 準備中の状態 → secondary（イベント draft 相当）
 *   - in_progress: アクティブ状態 → success（緑、イベント recruiting 相当）
 *   - completed:   終了状態 → outline（イベント ended 相当）
 *   - cancelled:   中断状態 → destructive（赤、イベント canceled 相当）
 */

export const PROJECT_STATUS_VALUES = [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

export const PROJECT_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  not_started: "secondary",
  in_progress: "success",
  completed: "outline",
  cancelled: "destructive",
};

/**
 * ラベルは messages/ja/enums.json の projectStatus と同じ値。
 * i18n を使う画面では useTranslations("enums.projectStatus") を使ってよい。
 */
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  not_started: "開始前",
  in_progress: "進行中",
  completed: "終了",
  cancelled: "中止",
};
