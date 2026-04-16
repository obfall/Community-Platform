"use client";

import { use } from "react";
import { BoardView } from "@/components/board/board-view";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  return <BoardView scope={{ kind: "project", projectId }} heading={{ title: "掲示板" }} />;
}
