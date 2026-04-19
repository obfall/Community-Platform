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
  {
    featureKey: "point",
    label: "ポイント管理",
    href: "/points",
    icon: Star,
    roles: ["admin", "owner"],
  },
  { featureKey: "skill_share", label: "スキルシェア", href: "/skills", icon: Share2 },
  {
    featureKey: "survey",
    label: "アンケート",
    href: "/surveys",
    icon: ClipboardList,
    roles: ["admin", "owner"],
  },
  {
    featureKey: "advertising",
    label: "広告",
    href: "/ads",
    icon: Megaphone,
    roles: ["admin", "owner"],
  },
  {
    featureKey: "mail_campaign",
    label: "配信",
    href: "/broadcasts",
    icon: Mail,
    roles: ["admin", "owner"],
  },
  {
    featureKey: "line_integration",
    label: "LINE連携",
    href: "/line",
    icon: Smartphone,
    roles: ["admin", "owner"],
  },
  {
    featureKey: "orientation",
    label: "オリエンテーション",
    href: "/orientation",
    icon: GraduationCap,
    roles: ["admin", "owner"],
  },
  {
    featureKey: "analytics",
    label: "アナリティクス",
    href: "/analytics",
    icon: BarChart3,
    roles: ["admin", "owner"],
  },
  { featureKey: "venue", label: "施設・会場", href: "/venues", icon: MapPin },
  {
    featureKey: "usage_history",
    label: "利用履歴",
    href: "/usage-history",
    icon: Bookmark,
    roles: ["admin", "owner"],
  },
  {
    featureKey: "moderation",
    label: "モデレーション",
    href: "/moderation",
    icon: Shield,
    roles: ["admin", "owner"],
  },
];

/** コミュニティ運営メニュー（owner 以上） */
export const COMMUNITY_ADMIN_ITEMS: AdminNavItem[] = [
  { label: "コミュニティ設定", href: "/settings/community", icon: Settings },
  { label: "メンバー管理", href: "/settings/members", icon: UserCog },
  { label: "動画管理", href: "/videos/manage", icon: Video },
  { label: "商品管理", href: "/shop/manage", icon: ShoppingBag },
  { label: "ポイント発行", href: "/points/grant", icon: Star },
];

/** システム管理メニュー（admin のみ） */
export const SYSTEM_ADMIN_ITEMS: AdminNavItem[] = [
  { label: "システム設定", href: "/settings/system", icon: Shield },
];
