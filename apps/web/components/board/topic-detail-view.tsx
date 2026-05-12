"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Heart, Eye, MessageCircle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth/use-auth";
import { useTopic, useDeleteTopic, useToggleTopicLike } from "@/hooks/board/use-board";
import { BoardScopeProvider, useBoardPaths, type BoardScope } from "./board-scope";
import { TopicPostSection } from "./topic-post-section";
import { EditTopicDialog } from "./edit-topic-dialog";

interface TopicDetailViewProps {
  scope: BoardScope;
  topicId: string;
}

export function TopicDetailView({ scope, topicId }: TopicDetailViewProps) {
  return (
    <BoardScopeProvider scope={scope}>
      <TopicDetailInner topicId={topicId} />
    </BoardScopeProvider>
  );
}

function TopicDetailInner({ topicId }: { topicId: string }) {
  const t = useTranslations("board");
  const router = useRouter();
  const { canEditAuthor } = useAuth();
  const paths = useBoardPaths();
  const { data: topic, isLoading } = useTopic(topicId);
  const deleteTopic = useDeleteTopic();
  const toggleLike = useToggleTopicLike();
  const [editOpen, setEditOpen] = useState(false);

  const isAuthorOrAdmin = topic && canEditAuthor(topic.author.id);

  const handleDelete = () => {
    if (!confirm(t("confirm.deleteTopic"))) return;
    deleteTopic.mutate(topicId, {
      onSuccess: () => router.push(paths.index),
    });
  };

  if (isLoading) {
    return <div className="h-60 animate-pulse rounded-lg bg-muted" />;
  }

  if (!topic) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground">
        {t("topic.notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={paths.index}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("topic.backToBoard")}
        </Link>
      </Button>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">{topic.category.name}</Badge>
            <h1 className="text-2xl font-bold">{topic.title}</h1>
          </div>
          {isAuthorOrAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t("menu.open")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("menu.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("menu.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="whitespace-pre-wrap rounded-lg border p-4 text-sm">{topic.body}</div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button
            onClick={() => toggleLike.mutate(topicId)}
            className={`flex items-center gap-1 ${topic.isLiked ? "text-red-500" : "hover:text-red-500"}`}
          >
            <Heart className={`h-4 w-4 ${topic.isLiked ? "fill-current" : ""}`} />
            {topic.likeCount}
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {topic.postCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {topic.viewCount}
          </span>
        </div>
      </div>

      <hr />

      <TopicPostSection topicId={topicId} />

      <EditTopicDialog open={editOpen} onOpenChange={setEditOpen} topicId={topicId} />
    </div>
  );
}
