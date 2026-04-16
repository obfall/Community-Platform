"use client";

import { use } from "react";
import { BoardView } from "@/components/board/board-view";

export default function EventBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  return <BoardView scope={{ kind: "event", eventId }} heading={{ title: "掲示板" }} />;
}
