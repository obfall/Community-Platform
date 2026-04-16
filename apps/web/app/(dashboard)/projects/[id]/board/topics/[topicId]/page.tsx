"use client";

import { use } from "react";
import { TopicDetailView } from "@/components/board/topic-detail-view";

export default function ProjectBoardTopicPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string }>;
}) {
  const { id: projectId, topicId } = use(params);
  return <TopicDetailView scope={{ kind: "project", projectId }} topicId={topicId} />;
}
