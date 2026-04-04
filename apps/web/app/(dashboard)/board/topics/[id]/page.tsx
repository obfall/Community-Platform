"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Edit, Trash2, Heart, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useTopic, useDeleteTopic, useToggleTopicLike } from "@/hooks/use-board";
import { TopicPostSection } from "../../_components/topic-post-section";

export default function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: topic, isLoading } = useTopic(id);
  const deleteTopic = useDeleteTopic();
  const toggleLike = useToggleTopicLike();

  const isAuthorOrAdmin =
    topic && (topic.author.id === user?.id || user?.role === "owner" || user?.role === "admin");

  const handleDelete = () => {
    if (!confirm("このトピックを削除しますか？")) return;
    deleteTopic.mutate(id, {
      onSuccess: () => router.push("/board"),
    });
  };

  if (isLoading) {
    return <div className="h-60 animate-pulse rounded-lg bg-muted" />;
  }

  if (!topic) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground">
        トピックが見つかりません
      </div>
    );
  }

  const initials = topic.author.name.slice(0, 2);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/board">
          <ArrowLeft className="mr-1 h-4 w-4" />
          掲示板に戻る
        </Link>
      </Button>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">{topic.category.name}</Badge>
            <h1 className="text-2xl font-bold">{topic.title}</h1>
          </div>
          {isAuthorOrAdmin && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/board/topics/${id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="font-medium">{topic.author.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(topic.createdAt), { addSuffix: true, locale: ja })}
            </p>
          </div>
        </div>

        <div className="whitespace-pre-wrap rounded-lg border p-4 text-sm">{topic.body}</div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button
            onClick={() => toggleLike.mutate(id)}
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

      <TopicPostSection topicId={id} />
    </div>
  );
}
