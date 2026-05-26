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
  Mail,
  GraduationCap,
  BarChart3,
  MapPin,
  FileText,
  Bookmark,
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
  roles?: string[];
}

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  featureKey?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { featureKey: "news", label: "ホーム", href: "/dashboard", icon: Home },
  { featureKey: "member", label: "メンバー", href: "/members", icon: Users },
  { featureKey: "board", label: "掲示板", href: "/board", icon: MessageSquare },
  { featureKey: "event", label: "イベント", href: "/events", icon: CalendarDays },
  { featureKey: "chat", label: "チャット", href: "/chat", icon: MessageCircle },
  { featureKey: "project", label: "プロジェクト", href: "/projects", icon: FolderKanban },
  { featureKey: "video", label: "動画", href: "/videos", icon: Video },
  { featureKey: "album", label: "アルバム", href: "/albums", icon: Image },
  { featureKey: "content", label: "コンテンツ", href: "/content", icon: FileText },
  { featureKey: "ec_shop", label: "EC・ショップ", href: "/shop", icon: ShoppingBag },
  { featureKey: "skill_share", label: "スキルシェア", href: "/skills", icon: Share2 },
  {
    featureKey: "orientation",
    label: "オリエンテーション",
    href: "/orientation",
    icon: GraduationCap,
    roles: ["admin", "owner"],
  },
  { featureKey: "venue", label: "施設・会場", href: "/venues", icon: MapPin },
];

/** コミュニティ管理メニュー（owner 以上） */
export const COMMUNITY_ADMIN_ITEMS: AdminNavItem[] = [
  { label: "コミュニティ設定", href: "/settings/community", icon: Settings },
  { label: "メンバー管理", href: "/settings/members", icon: UserCog, featureKey: "member" },
  { label: "動画管理", href: "/videos/manage", icon: Video, featureKey: "video" },
  { label: "EC管理", href: "/shop/manage", icon: ShoppingBag, featureKey: "ec_shop" },
  { label: "ポイント管理", href: "/points", icon: Star, featureKey: "point" },
  { label: "アンケート管理", href: "/surveys", icon: ClipboardList, featureKey: "survey" },
  { label: "配信", href: "/broadcasts", icon: Mail, featureKey: "mail_campaign" },
  { label: "アナリティクス", href: "/analytics", icon: BarChart3, featureKey: "analytics" },
  { label: "利用履歴", href: "/usage-history", icon: Bookmark, featureKey: "usage_history" },
  { label: "モデレーション", href: "/moderation", icon: Shield, featureKey: "moderation" },
];

/** システム管理メニュー（admin のみ） */
export const SYSTEM_ADMIN_ITEMS: AdminNavItem[] = [
  { label: "システム設定", href: "/settings/system", icon: Shield },
];
