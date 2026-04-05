"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEvent } from "@/hooks/use-events";
import { EVENT_DETAIL_NAV_ITEMS } from "@/lib/event-detail-navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";

interface EventSidebarProps {
  eventId: string;
}

export function EventSidebar({ eventId }: EventSidebarProps) {
  const pathname = usePathname();
  const { data: event } = useEvent(eventId);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-3">
        {/* イベント一覧に戻る */}
        <Link
          href="/events"
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          イベント一覧に戻る
        </Link>

        {/* イベント名 */}
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {event?.title ?? "..."}
          </p>
        </div>

        {/* ナビゲーション */}
        {EVENT_DETAIL_NAV_ITEMS.map((item) => {
          const href =
            item.segment === "" ? `/events/${eventId}` : `/events/${eventId}/${item.segment}`;

          const isActive =
            item.segment === ""
              ? pathname === `/events/${eventId}`
              : pathname.startsWith(`/events/${eventId}/${item.segment}`);

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
              {item.label}
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
