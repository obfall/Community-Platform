import type { EventSpeakerRole } from "@/lib/api/types";

/**
 * 登壇者の役割の選択肢。Select の options と詳細ページのラベル表示で参照する。
 * バック側 schema.prisma の EventSpeakerRole enum と整合させる。
 */
export const EVENT_SPEAKER_ROLE_OPTIONS: Array<{
  value: EventSpeakerRole;
  label: string;
}> = [
  { value: "speaker", label: "講師" },
  { value: "co_speaker", label: "共同講師" },
  { value: "guest", label: "ゲスト" },
  { value: "moderator", label: "モデレーター" },
  { value: "panelist", label: "パネリスト" },
];

export const EVENT_SPEAKER_ROLE_LABELS: Record<EventSpeakerRole, string> = {
  speaker: "講師",
  co_speaker: "共同講師",
  guest: "ゲスト",
  moderator: "モデレーター",
  panelist: "パネリスト",
};
