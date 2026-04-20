"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { EventDetailSidebar } from "./events/[id]/_components/sidebar";
import { ProjectDetailSidebar } from "./projects/[id]/_components/sidebar";
import { ProfileSidebar } from "./profile/_components/sidebar";
import { ShopSidebar } from "./shop/_components/sidebar";
import { extractEventIdFromPath } from "@/lib/event-navigation";
import { extractProjectIdFromPath } from "@/lib/project-navigation";
import { isProfilePath } from "@/lib/profile-navigation";
import { isShopPath } from "@/lib/shop-navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const eventId = extractEventIdFromPath(pathname);
  const projectId = extractProjectIdFromPath(pathname);

  const isProfile = isProfilePath(pathname);
  const isShop = isShopPath(pathname);

  function renderSidebar() {
    if (eventId) return <EventDetailSidebar eventId={eventId} />;
    if (projectId) return <ProjectDetailSidebar projectId={projectId} />;
    if (isProfile) return <ProfileSidebar />;
    if (isShop) return <ShopSidebar />;
    return <Sidebar />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header eventId={eventId} projectId={projectId} isProfile={isProfile} isShop={isShop} />
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
          {renderSidebar()}
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
