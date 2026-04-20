"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, Settings, LayoutDashboard, Bell, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/auth/use-auth";
import { useUnreadCount } from "@/hooks/notifications/use-notifications";
import { useAppSettings } from "@/hooks/settings/use-app-settings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { EventDetailSidebar } from "@/app/(dashboard)/events/[id]/_components/sidebar";
import { ProjectDetailSidebar } from "@/app/(dashboard)/projects/[id]/_components/sidebar";
import { ProfileSidebar } from "@/app/(dashboard)/profile/_components/sidebar";
import { ShopSidebar } from "@/app/(dashboard)/shop/_components/sidebar";

interface HeaderProps {
  eventId?: string | null;
  projectId?: string | null;
  isProfile?: boolean;
  isShop?: boolean;
}

export function Header({ eventId, projectId, isProfile, isShop }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const { data: settings } = useAppSettings();
  const unreadCount = unreadData?.count ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoUrl = settings?.find((s) => s.key === "logo_url")?.value ?? "";
  const siteName = settings?.find((s) => s.key === "site_name")?.value ?? "Community Platform";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const headerBg = settings?.find((s) => s.key === "header_bg_color")?.value ?? "";
  const headerText = settings?.find((s) => s.key === "header_text_color")?.value ?? "";

  return (
    <header
      className={`sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 ${
        headerBg ? "" : "bg-background"
      } ${headerText ? "" : "text-foreground"}`}
      style={{
        ...(headerBg && { backgroundColor: headerBg }),
        ...(headerText && { color: headerText }),
      }}
    >
      {/* モバイル: ハンバーガーメニュー */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">メニュー</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">ナビゲーション</SheetTitle>
          <div className="flex h-14 items-center border-b px-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
            ) : (
              <span className="font-bold">{siteName}</span>
            )}
          </div>
          <div onClick={() => setMobileOpen(false)}>
            {eventId ? (
              <EventDetailSidebar eventId={eventId} />
            ) : projectId ? (
              <ProjectDetailSidebar projectId={projectId} />
            ) : isProfile ? (
              <ProfileSidebar />
            ) : isShop ? (
              <ShopSidebar />
            ) : (
              <Sidebar />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ロゴ */}
      <Link href="/dashboard" className="flex items-center gap-2 font-bold">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
        ) : (
          <span>{siteName}</span>
        )}
      </Link>

      <div className="flex-1" />

      {/* FAQ */}
      <Button variant="ghost" size="icon" asChild>
        <Link href="/faq">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">FAQ</span>
        </Link>
      </Button>

      {/* 通知ベル */}
      <Button variant="ghost" size="icon" className="relative" asChild>
        <Link href="/notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">通知</span>
        </Link>
      </Button>

      {/* ユーザーメニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              マイページ
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/settings/community" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                設定
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
