"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/auth/use-auth";
import { useFeatures } from "@/hooks/settings/use-features";
import { useChatRooms } from "@/hooks/chat/use-chat";
import { NAV_ITEMS, COMMUNITY_ADMIN_ITEMS, SYSTEM_ADMIN_ITEMS } from "@/lib/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: features } = useFeatures();

  const enabledKeys = new Set(features?.filter((f) => f.isEnabled).map((f) => f.featureKey) ?? []);

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      enabledKeys.has(item.featureKey) && (!item.roles || item.roles.includes(user?.role ?? "")),
  );
  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";
  const isSystemAdmin = user?.role === "admin";

  const renderNavGroup = (label: string, items: typeof COMMUNITY_ADMIN_ITEMS) => {
    const visible = items.filter((item) => !item.featureKey || enabledKeys.has(item.featureKey));
    if (visible.length === 0) return null;
    return (
      <>
        <Separator className="my-3" />
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
          {label}
        </p>
        {visible.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
          メニュー
        </p>
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.featureKey}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.featureKey === "chat" && <ChatUnreadBadge />}
            </Link>
          );
        })}

        {isOwnerOrAdmin && renderNavGroup("コミュニティ管理", COMMUNITY_ADMIN_ITEMS)}
        {isSystemAdmin && renderNavGroup("システム管理", SYSTEM_ADMIN_ITEMS)}
      </div>
    </ScrollArea>
  );
}

// チャットの未読合計バッジ。chat 機能の useChatRooms に乗っかって 60 秒 polling される。
function ChatUnreadBadge() {
  const { data: rooms } = useChatRooms();
  const total = rooms?.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0) ?? 0;
  if (total === 0) return null;
  return (
    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
      {total > 99 ? "99+" : total}
    </Badge>
  );
}
