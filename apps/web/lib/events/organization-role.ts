import type { EventOrganizationRole } from "@/lib/api/types";

/**
 * 関係団体の役割の選択肢。Select の options と Badge ラベルの両方で参照する。
 * バック側 schema.prisma の EventOrganizationRole enum と整合させる。
 */
export const EVENT_ORGANIZATION_ROLE_OPTIONS: Array<{
  value: EventOrganizationRole;
  label: string;
}> = [
  { value: "organizer", label: "主催" },
  { value: "co_organizer", label: "共催" },
  { value: "cooperation", label: "協力" },
  { value: "sponsor", label: "協賛" },
  { value: "support", label: "後援" },
];

export const EVENT_ORGANIZATION_ROLE_LABELS: Record<EventOrganizationRole, string> = {
  organizer: "主催",
  co_organizer: "共催",
  cooperation: "協力",
  sponsor: "協賛",
  support: "後援",
};
