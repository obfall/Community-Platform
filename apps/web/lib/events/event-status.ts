import { EventStatus } from "@community-platform/shared";
import type { EventStatus as EventStatusType } from "@community-platform/shared";

/**
 * イベントステータス関連の表示定数。
 *
 * - ラベル本体は messages/ja/enums.json の eventStatus に集約され、
 *   useTranslations("enums.eventStatus") から参照する。
 * - ここでは「value のリスト」と「色味系の対応表（i18n に乗らない情報）」のみ持つ。
 */

/** Badge コンポーネントの variant 対応 */
export const EVENT_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  draft: "secondary",
  recruiting: "success",
  closed: "outline",
  canceled: "destructive",
  ended: "outline",
};

/** 編集ページなどでステータスを切り替える用の値リスト（5 種全部、表示順固定） */
export const EVENT_STATUS_OPTION_VALUES: readonly EventStatusType[] = [
  EventStatus.DRAFT,
  EventStatus.RECRUITING,
  EventStatus.CLOSED,
  EventStatus.CANCELED,
  EventStatus.ENDED,
];

/**
 * 一覧ページのステータスフィルタの値リスト。canceled は能動的に絞り込むケースが
 * 想定されないため敢えて除外。
 */
export const EVENT_STATUS_FILTER_VALUES: readonly EventStatusType[] =
  EVENT_STATUS_OPTION_VALUES.filter((v) => v !== EventStatus.CANCELED);
