"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { EventSidebar } from "@/components/event-sidebar";
import { ProjectSidebar } from "@/components/project-sidebar";
import { extractEventIdFromPath } from "@/lib/event-detail-navigation";
import { extractProjectIdFromPath } from "@/lib/project-detail-navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const eventId = extractEventIdFromPath(pathname);
  const projectId = extractProjectIdFromPath(pathname);

  const contextId = eventId ?? projectId;

  function renderSidebar() {
    if (eventId) return <EventSidebar eventId={eventId} />;
    if (projectId) return <ProjectSidebar projectId={projectId} />;
    return <Sidebar />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header eventId={eventId} projectId={projectId} />
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
          {renderSidebar()}
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
