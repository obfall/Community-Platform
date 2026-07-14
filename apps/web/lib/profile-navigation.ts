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
  // i18n キー（messages/ja/profile.json の nav.* を参照）。
  // 表示側で useTranslations("profile") の t(`nav.${labelKey}`) で解決する。
  labelKey: string;
  segment: string;
  icon: LucideIcon;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { labelKey: "profile", segment: "", icon: User },
  { labelKey: "activity", segment: "activity", icon: CalendarDays },
  { labelKey: "points", segment: "points", icon: Star },
  { labelKey: "library", segment: "library", icon: BookOpen },
  { labelKey: "tickets", segment: "tickets", icon: Ticket },
  { labelKey: "reservations", segment: "reservations", icon: CalendarCheck },
  { labelKey: "tasks", segment: "tasks", icon: CheckSquare },
  { labelKey: "calendar", segment: "calendar", icon: Calendar },
  { labelKey: "memo", segment: "memo", icon: StickyNote },
];

export const PROFILE_SETTINGS_ITEMS: ProfileNavItem[] = [
  { labelKey: "settings", segment: "settings", icon: Settings },
];

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}
