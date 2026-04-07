"use client";

import { use } from "react";
import { EventDetailBreadcrumb } from "./_components/breadcrumb";

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
      <EventDetailBreadcrumb eventId={id} />
      {children}
    </div>
  );
}
