"use client";

import { useTranslations } from "next-intl";
import { BoardView } from "@/components/board/board-view";

export default function BoardPage() {
  const t = useTranslations("board");
  return (
    <BoardView
      scope={{ kind: "global" }}
      heading={{ title: t("heading.title"), description: t("heading.description") }}
    />
  );
}
