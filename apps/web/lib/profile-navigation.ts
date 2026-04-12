import {
  CalendarDays,
  Star,
  BookOpen,
  Ticket,
  CalendarCheck,
  CheckSquare,
  StickyNote,
  Pencil,
  Globe,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface ProfileNavItem {
  label: string;
  segment: string;
  icon: LucideIcon;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { label: "アクティビティ", segment: "", icon: CalendarDays },
  { label: "ポイント", segment: "points", icon: Star },
  { label: "マイライブラリー", segment: "library", icon: BookOpen },
  { label: "マイチケット", segment: "tickets", icon: Ticket },
  { label: "マイ予約", segment: "reservations", icon: CalendarCheck },
  { label: "マイタスク", segment: "tasks", icon: CheckSquare },
  { label: "メモ", segment: "memo", icon: StickyNote },
];

export const PROFILE_SETTINGS_ITEMS: ProfileNavItem[] = [
  { label: "プロフィール編集", segment: "edit", icon: Pencil },
  { label: "公開情報編集", segment: "public-info", icon: Globe },
  { label: "個人設定", segment: "settings", icon: Settings },
];

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}
