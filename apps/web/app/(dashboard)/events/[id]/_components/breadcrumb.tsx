"use client";

import { usePathname } from "next/navigation";
import { useEvent } from "@/hooks/events/use-events";
import { Breadcrumb } from "@/components/breadcrumb";
import type { BreadcrumbItem } from "@/components/breadcrumb";

interface EventDetailBreadcrumbProps {
  eventId: string;
}

const SURVEY_SUB_LABELS: Record<string, string> = {
  new: "新規作成",
  edit: "編集",
  respond: "回答",
  results: "結果",
};

const BROADCAST_SUB_LABELS: Record<string, string> = {
  new: "新規作成",
};

export function EventDetailBreadcrumb({ eventId }: EventDetailBreadcrumbProps) {
  const pathname = usePathname();
  const { data: event } = useEvent(eventId);

  if (pathname?.startsWith(`/events/${eventId}/results`)) return null;

  const items: BreadcrumbItem[] = [
    { label: "イベント", href: "/events" },
    { label: event?.title ?? "...", href: `/events/${eventId}` },
  ];

  // アンケート配下のサブページ用パンくず
  const surveyBase = `/events/${eventId}/survey`;
  if (pathname?.startsWith(surveyBase)) {
    const rest = pathname.slice(surveyBase.length);

    if (rest === "" || rest === "/") {
      // /events/{id}/survey — アンケート一覧自体
      items.push({ label: "アンケート" });
    } else if (rest === "/new") {
      items.push({ label: "アンケート", href: surveyBase });
      items.push({ label: "新規作成" });
    } else {
      // /events/{id}/survey/{surveyId}/(edit|respond|results)
      items.push({ label: "アンケート", href: surveyBase });
      const lastSegment = rest.split("/").filter(Boolean).pop() ?? "";
      const subLabel = SURVEY_SUB_LABELS[lastSegment];
      if (subLabel) {
        items.push({ label: subLabel });
      }
    }
  }

  // 配信配下のサブページ用パンくず
  const broadcastBase = `/events/${eventId}/broadcasts`;
  if (pathname?.startsWith(broadcastBase)) {
    const rest = pathname.slice(broadcastBase.length);

    if (rest === "" || rest === "/") {
      // /events/{id}/broadcasts — 配信一覧
      items.push({ label: "配信" });
    } else if (rest === "/new") {
      items.push({ label: "配信", href: broadcastBase });
      items.push({ label: "新規作成" });
    } else {
      // /events/{id}/broadcasts/{broadcastId}
      items.push({ label: "配信", href: broadcastBase });
      const lastSegment = rest.split("/").filter(Boolean).pop() ?? "";
      const subLabel = BROADCAST_SUB_LABELS[lastSegment] ?? "詳細";
      items.push({ label: subLabel });
    }
  }

  return <Breadcrumb items={items} />;
}
