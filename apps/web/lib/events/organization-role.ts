import { EventOrganizationRole } from "@community-platform/shared";
import type { EventOrganizationRole as EventOrganizationRoleType } from "@community-platform/shared";

/**
 * 関係団体の役割の値リスト（表示順固定）。
 * ラベルは messages/ja/enums.json の eventOrganizationRole から取得する。
 */
export const EVENT_ORGANIZATION_ROLE_VALUES_ORDERED: readonly EventOrganizationRoleType[] = [
  EventOrganizationRole.ORGANIZER,
  EventOrganizationRole.CO_ORGANIZER,
  EventOrganizationRole.COOPERATION,
  EventOrganizationRole.SPONSOR,
  EventOrganizationRole.SUPPORT,
];
