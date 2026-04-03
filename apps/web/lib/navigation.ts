import {
  Home,
  MessageSquare,
  CalendarDays,
  Users,
  MessageCircle,
  FolderKanban,
  Video,
  Image,
  ShoppingBag,
  Star,
  Share2,
  ClipboardList,
  Megaphone,
  Mail,
  Smartphone,
  GraduationCap,
  BarChart3,
  MapPin,
  FileText,
  Bell,
  UserCheck,
  Bookmark,
  Calendar,
  StickyNote,
  Settings,
  Shield,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  featureKey: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { featureKey: "news", label: "新着情報", href: "/dashboard", icon: Home },
  { featureKey: "notification", label: "通知", href: "/notifications", icon: Bell },
  { featureKey: "member", label: "メンバー", href: "/members", icon: Users },
  { featureKey: "profile", label: "プロフィール", href: "/profile", icon: UserCheck },
  { featureKey: "calendar", label: "カレンダー", href: "/calendar", icon: Calendar },
  { featureKey: "memo", label: "メモ", href: "/memo", icon: StickyNote },
  { featureKey: "board", label: "掲示板", href: "/board", icon: MessageSquare },
  { featureKey: "event", label: "イベント", href: "/events", icon: CalendarDays },
  { featureKey: "chat", label: "チャット", href: "/chat", icon: MessageCircle },
  { featureKey: "project", label: "プロジェクト", href: "/projects", icon: FolderKanban },
  { featureKey: "video", label: "動画", href: "/videos", icon: Video },
  { featureKey: "album", label: "アルバム", href: "/albums", icon: Image },
  { featureKey: "content", label: "コンテンツ", href: "/content", icon: FileText },
  { featureKey: "ec_shop", label: "EC・ショップ", href: "/shop", icon: ShoppingBag },
  { featureKey: "point", label: "ポイント", href: "/points", icon: Star },
  { featureKey: "skill_share", label: "スキルシェア", href: "/skills", icon: Share2 },
  { featureKey: "survey", label: "アンケート", href: "/surveys", icon: ClipboardList },
  { featureKey: "advertising", label: "広告", href: "/ads", icon: Megaphone },
  { featureKey: "mail_campaign", label: "メール配信", href: "/campaigns", icon: Mail },
  { featureKey: "line_integration", label: "LINE連携", href: "/line", icon: Smartphone },
  {
    featureKey: "orientation",
    label: "オリエンテーション",
    href: "/orientation",
    icon: GraduationCap,
  },
  { featureKey: "analytics", label: "アナリティクス", href: "/analytics", icon: BarChart3 },
  { featureKey: "venue", label: "施設・会場", href: "/venues", icon: MapPin },
  { featureKey: "usage_history", label: "利用履歴", href: "/usage-history", icon: Bookmark },
  { featureKey: "moderation", label: "モデレーション", href: "/moderation", icon: Shield },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "コミュニティ設定", href: "/settings/community", icon: Settings },
  { label: "権限設定", href: "/settings/permissions", icon: Shield },
  { label: "メンバー管理", href: "/settings/members", icon: UserCog },
];
