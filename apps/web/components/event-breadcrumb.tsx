"use client";

import { useEvent } from "@/hooks/use-events";
import { Breadcrumb } from "@/components/breadcrumb";

interface EventBreadcrumbProps {
  eventId: string;
}

export function EventBreadcrumb({ eventId }: EventBreadcrumbProps) {
  const { data: event } = useEvent(eventId);

  return (
    <Breadcrumb
      items={[{ label: "イベント", href: "/events" }, { label: event?.title ?? "..." }]}
    />
  );
}
