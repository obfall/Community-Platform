"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { BoardView } from "@/components/board/board-view";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const t = useTranslations("projects.board");
  return <BoardView scope={{ kind: "project", projectId }} heading={{ title: t("title") }} />;
}
