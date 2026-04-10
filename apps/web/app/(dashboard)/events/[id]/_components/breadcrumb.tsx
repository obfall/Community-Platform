"use client";

import { useEvent } from "@/hooks/events/use-events";
import { Breadcrumb } from "@/components/breadcrumb";

interface EventDetailBreadcrumbProps {
  eventId: string;
}

export function EventDetailBreadcrumb({ eventId }: EventDetailBreadcrumbProps) {
  const { data: event } = useEvent(eventId);

  return (
    <Breadcrumb
      items={[{ label: "イベント", href: "/events" }, { label: event?.title ?? "..." }]}
    />
  );
}
