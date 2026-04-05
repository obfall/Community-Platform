import {
  Info,
  Users,
  MessageSquare,
  CheckSquare,
  Newspaper,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

export interface ProjectDetailNavItem {
  label: string;
  segment: string;
  icon: LucideIcon;
}

export const PROJECT_DETAIL_NAV_ITEMS: ProjectDetailNavItem[] = [
  { label: "基本情報", segment: "", icon: Info },
  { label: "メンバー", segment: "members", icon: Users },
  { label: "メッセージ", segment: "messages", icon: MessageSquare },
  { label: "タスク", segment: "tasks", icon: CheckSquare },
  { label: "掲示板", segment: "board", icon: Newspaper },
  { label: "ファイル", segment: "files", icon: FolderOpen },
];

export function extractProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([0-9a-f-]{36})(\/|$)/);
  return match?.[1] ?? null;
}
