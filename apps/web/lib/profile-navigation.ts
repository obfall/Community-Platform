import {
  User,
  CalendarDays,
  Star,
  BookOpen,
  Ticket,
  CalendarCheck,
  CheckSquare,
  StickyNote,
  Calendar,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface ProfileNavItem {
  label: string;
  segment: string;
  icon: LucideIcon;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { label: "プロフィール", segment: "", icon: User },
  { label: "アクティビティ", segment: "activity", icon: CalendarDays },
  { label: "ポイント", segment: "points", icon: Star },
  { label: "マイライブラリー", segment: "library", icon: BookOpen },
  { label: "マイチケット", segment: "tickets", icon: Ticket },
  { label: "マイ予約", segment: "reservations", icon: CalendarCheck },
  { label: "マイタスク", segment: "tasks", icon: CheckSquare },
  { label: "カレンダー", segment: "calendar", icon: Calendar },
  { label: "メモ", segment: "memo", icon: StickyNote },
];

export const PROFILE_SETTINGS_ITEMS: ProfileNavItem[] = [
  { label: "個人設定", segment: "settings", icon: Settings },
];

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}
