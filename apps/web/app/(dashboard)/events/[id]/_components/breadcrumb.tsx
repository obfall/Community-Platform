"use client";

import { usePathname } from "next/navigation";
import { useEvent } from "@/hooks/events/use-events";
import { Breadcrumb } from "@/components/breadcrumb";

interface EventDetailBreadcrumbProps {
  eventId: string;
}

export function EventDetailBreadcrumb({ eventId }: EventDetailBreadcrumbProps) {
  const pathname = usePathname();
  const { data: event } = useEvent(eventId);

  if (pathname?.startsWith(`/events/${eventId}/results`)) return null;

  return (
    <Breadcrumb
      items={[{ label: "イベント", href: "/events" }, { label: event?.title ?? "..." }]}
    />
  );
}
