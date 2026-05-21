import {
  Info,
  Users,
  MessageSquare,
  CheckSquare,
  Newspaper,
  FolderOpen,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

/** i18n キー（messages/ja/projects.json の sidebar.nav 配下） */
export type ProjectDetailNavKey =
  | "info"
  | "members"
  | "messages"
  | "tasks"
  | "schedule"
  | "board"
  | "files";

export interface ProjectDetailNavItem {
  /** projects.sidebar.nav.<labelKey> で参照する翻訳キー */
  labelKey: ProjectDetailNavKey;
  segment: string;
  icon: LucideIcon;
}

export const PROJECT_DETAIL_NAV_ITEMS: ProjectDetailNavItem[] = [
  { labelKey: "info", segment: "", icon: Info },
  { labelKey: "members", segment: "members", icon: Users },
  { labelKey: "messages", segment: "messages", icon: MessageSquare },
  { labelKey: "tasks", segment: "tasks", icon: CheckSquare },
  { labelKey: "schedule", segment: "schedule", icon: CalendarDays },
  { labelKey: "board", segment: "board", icon: Newspaper },
  { labelKey: "files", segment: "files", icon: FolderOpen },
];

export function extractProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([0-9a-f-]{36})(\/|$)/);
  return match?.[1] ?? null;
}
