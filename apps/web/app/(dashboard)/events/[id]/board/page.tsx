"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { BoardView } from "@/components/board/board-view";

export default function EventBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const t = useTranslations("board");
  return (
    <BoardView
      scope={{ kind: "event", eventId }}
      heading={{ title: t("heading.title"), description: t("heading.eventDescription") }}
    />
  );
}
