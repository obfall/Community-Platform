"use client";

import { useProjectBoardTopics } from "@/hooks/use-projects";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Heart, Plus } from "lucide-react";

interface TopicListProps {
  projectId: string;
  categoryId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function TopicList({ projectId, categoryId, onSelect, onNew }: TopicListProps) {
  const { data } = useProjectBoardTopics(projectId, { categoryId });
  type T = {
    id: string;
    title: string;
    isPinned: boolean;
    commentCount: number;
    likeCount: number;
    author: { name: string };
    createdAt: string;
  };
  const topics = (data as { data: T[] } | undefined)?.data ?? [];

  return (
    <div className="space-y-1">
      {topics.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm hover:bg-accent"
        >
          {t.isPinned && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              固定
            </Badge>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{t.title}</p>
            <p className="text-xs text-muted-foreground">{t.author.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {t.commentCount}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="h-3 w-3" />
              {t.likeCount}
            </span>
          </div>
        </button>
      ))}
      <button
        type="button"
        onClick={onNew}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        新規トピック
      </button>
    </div>
  );
}
