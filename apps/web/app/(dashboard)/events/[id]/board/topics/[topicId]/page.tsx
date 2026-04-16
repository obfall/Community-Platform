"use client";

import { use } from "react";
import { TopicDetailView } from "@/components/board/topic-detail-view";

export default function EventBoardTopicPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string }>;
}) {
  const { id: eventId, topicId } = use(params);
  return <TopicDetailView scope={{ kind: "event", eventId }} topicId={topicId} />;
}
