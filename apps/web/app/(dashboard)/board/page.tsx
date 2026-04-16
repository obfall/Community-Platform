"use client";

import { BoardView } from "@/components/board/board-view";

export default function BoardPage() {
  return (
    <BoardView
      scope={{ kind: "global" }}
      heading={{ title: "掲示板", description: "コミュニティの掲示板" }}
    />
  );
}
