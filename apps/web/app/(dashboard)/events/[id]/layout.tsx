"use client";

import { use } from "react";
import { EventBreadcrumb } from "@/components/event-breadcrumb";

export default function EventDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div>
      <EventBreadcrumb eventId={id} />
      {children}
    </div>
  );
}
