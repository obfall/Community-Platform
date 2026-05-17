import { EventSpeakerRole } from "@community-platform/shared";
import type { EventSpeakerRole as EventSpeakerRoleType } from "@community-platform/shared";

/**
 * 登壇者の役割の値リスト（表示順固定）。
 * ラベルは messages/ja/enums.json の eventSpeakerRole から取得する。
 */
export const EVENT_SPEAKER_ROLE_VALUES_ORDERED: readonly EventSpeakerRoleType[] = [
  EventSpeakerRole.SPEAKER,
  EventSpeakerRole.CO_SPEAKER,
  EventSpeakerRole.GUEST,
  EventSpeakerRole.MODERATOR,
  EventSpeakerRole.PANELIST,
];
