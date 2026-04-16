"use client";

import { use } from "react";
import { TopicDetailView } from "@/components/board/topic-detail-view";

export default function BoardTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TopicDetailView scope={{ kind: "global" }} topicId={id} />;
}
