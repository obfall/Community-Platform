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
  /** header 名前空間の翻訳キー（例: "nav.news"）。表示は sidebar 側で t() する */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

export interface AdminNavItem {
  /** header 名前空間の翻訳キー（例: "admin.communitySettings"） */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  featureKey?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { featureKey: "news", labelKey: "nav.news", href: "/dashboard", icon: Home },
  { featureKey: "member", labelKey: "nav.member", href: "/members", icon: Users },
  { featureKey: "board", labelKey: "nav.board", href: "/board", icon: MessageSquare },
  { featureKey: "event", labelKey: "nav.event", href: "/events", icon: CalendarDays },
  { featureKey: "chat", labelKey: "nav.chat", href: "/chat", icon: MessageCircle },
  { featureKey: "project", labelKey: "nav.project", href: "/projects", icon: FolderKanban },
  { featureKey: "video", labelKey: "nav.video", href: "/videos", icon: Video },
  { featureKey: "album", labelKey: "nav.album", href: "/albums", icon: Image },
  { featureKey: "content", labelKey: "nav.content", href: "/content", icon: FileText },
  { featureKey: "ec_shop", labelKey: "nav.ec_shop", href: "/shop", icon: ShoppingBag },
  { featureKey: "skill_share", labelKey: "nav.skill_share", href: "/skills", icon: Share2 },
  {
    featureKey: "orientation",
    labelKey: "nav.orientation",
    href: "/orientation",
    icon: GraduationCap,
    roles: ["admin", "owner"],
  },
  { featureKey: "venue", labelKey: "nav.venue", href: "/venues", icon: MapPin },
];

/** コミュニティ管理メニュー（owner 以上） */
export const COMMUNITY_ADMIN_ITEMS: AdminNavItem[] = [
  { labelKey: "admin.communitySettings", href: "/settings/community", icon: Settings },
  {
    labelKey: "admin.memberManagement",
    href: "/settings/members",
    icon: UserCog,
    featureKey: "member",
  },
  { labelKey: "admin.videoManagement", href: "/videos/manage", icon: Video, featureKey: "video" },
  {
    labelKey: "admin.ecManagement",
    href: "/shop/manage",
    icon: ShoppingBag,
    featureKey: "ec_shop",
  },
  { labelKey: "admin.pointManagement", href: "/points", icon: Star, featureKey: "point" },
  {
    labelKey: "admin.surveyManagement",
    href: "/surveys",
    icon: ClipboardList,
    featureKey: "survey",
  },
  { labelKey: "admin.broadcast", href: "/broadcasts", icon: Mail, featureKey: "mail_campaign" },
  { labelKey: "admin.analytics", href: "/analytics", icon: BarChart3, featureKey: "analytics" },
  {
    labelKey: "admin.usageHistory",
    href: "/usage-history",
    icon: Bookmark,
    featureKey: "usage_history",
  },
  { labelKey: "admin.moderation", href: "/moderation", icon: Shield, featureKey: "moderation" },
];

/** システム管理メニュー（admin のみ） */
export const SYSTEM_ADMIN_ITEMS: AdminNavItem[] = [
  { labelKey: "admin.systemSettings", href: "/settings/system", icon: Shield },
];
