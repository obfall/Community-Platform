import {
  Info,
  Users,
  Mail,
  BarChart3,
  MessageSquare,
  ClipboardList,
  FolderOpen,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export interface EventDetailNavItem {
  label: string;
  segment: string;
  icon: LucideIcon;
}

export const EVENT_DETAIL_NAV_ITEMS: EventDetailNavItem[] = [
  { label: "基本情報", segment: "", icon: Info },
  { label: "参加者情報", segment: "participants", icon: Users },
  { label: "メール配信", segment: "mail", icon: Mail },
  { label: "実施結果", segment: "results", icon: BarChart3 },
  { label: "掲示板", segment: "board", icon: MessageSquare },
  { label: "アンケート", segment: "survey", icon: ClipboardList },
  { label: "ファイル", segment: "files", icon: FolderOpen },
  { label: "支払決済", segment: "payments", icon: CreditCard },
];

export function extractEventIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/events\/([0-9a-f-]{36})(\/|$)/);
  return match?.[1] ?? null;
}
