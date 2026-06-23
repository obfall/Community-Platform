"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile } from "@/hooks/profile/use-profile";
import { usePointSummary } from "@/hooks/points/use-points";
import { PROFILE_NAV_ITEMS, PROFILE_SETTINGS_ITEMS } from "@/lib/profile-navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star } from "lucide-react";

export function ProfileSidebar() {
  const pathname = usePathname();
  const t = useTranslations("profile");
  const tRole = useTranslations("enums.role");
  const { user } = useAuth();
  const { data: profileData } = useMyProfile();
  const { data: pointSummary } = usePointSummary();

  const profile = profileData?.profile;
  const publicInfo = profileData?.publicInfo;

  const renderNavItems = (items: typeof PROFILE_NAV_ITEMS) =>
    items.map((item) => {
      const href = item.segment === "" ? "/profile" : `/profile/${item.segment}`;
      const isActive =
        item.segment === ""
          ? pathname === "/profile"
          : pathname.startsWith(`/profile/${item.segment}`);

      return (
        <Link
          key={item.segment || "root"}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {t(`nav.${item.labelKey}`)}
        </Link>
      );
    });

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-3">
        {/* メインメニューに戻る */}
        <Link
          href="/dashboard"
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.mainMenu")}
        </Link>

        {/* ユーザー情報 */}
        <div className="mb-3 flex items-center gap-3 px-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatarUrl ?? undefined} alt={user?.name} />
            <AvatarFallback className="text-sm">{user?.name?.slice(0, 2) ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.name}</p>
            {publicInfo?.nickname && (
              <p className="truncate text-xs text-sidebar-foreground/60">@{publicInfo.nickname}</p>
            )}
            <Badge variant="secondary" className="mt-0.5 text-xs">
              {user?.role && tRole.has(user.role) ? tRole(user.role) : user?.role}
            </Badge>
          </div>
        </div>

        {/* ポイント */}
        <div className="mb-3 flex items-center justify-between rounded-md bg-sidebar-accent/30 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
            <Star className="h-3.5 w-3.5" />
            {t("nav.pointsLabel")}
          </div>
          <span className="text-sm font-bold text-sidebar-foreground">
            {pointSummary?.availablePoints?.toLocaleString() ?? 0}
          </span>
        </div>

        <Separator className="mb-2" />

        {/* メニュー */}
        {renderNavItems(PROFILE_NAV_ITEMS)}

        <Separator className="my-2" />

        {renderNavItems(PROFILE_SETTINGS_ITEMS)}
      </div>
    </ScrollArea>
  );
}
