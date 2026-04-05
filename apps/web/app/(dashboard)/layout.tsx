"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { EventSidebar } from "@/components/event-sidebar";
import { extractEventIdFromPath } from "@/lib/event-detail-navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const eventId = extractEventIdFromPath(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <Header eventId={eventId} />
      <div className="flex flex-1">
        {/* デスクトップサイドバー */}
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
          {eventId ? <EventSidebar eventId={eventId} /> : <Sidebar />}
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
