"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTopicPosts, useCreateTopicPost, useToggleTopicPostLike } from "@/hooks/use-board";
import { TopicPostCommentSection } from "./topic-post-comment-section";
import type { BoardTopicPost } from "@/lib/api/types";

function PostCard({
  post,
  onToggleLike,
}: {
  post: BoardTopicPost;
  onToggleLike: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const initials = post.author.name.slice(0, 2);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{post.author.name}</span>
            <span>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ja })}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{post.body}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <button
          onClick={() => onToggleLike(post.id)}
          className={`flex items-center gap-1 ${post.isLiked ? "text-red-500" : "hover:text-red-500"}`}
        >
          <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
          {post.likeCount > 0 && post.likeCount}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount > 0 ? post.commentCount : "返信"}
        </button>
      </div>

      {showComments && (
        <div className="border-t pt-3">
          <TopicPostCommentSection postId={post.id} />
        </div>
      )}
    </div>
  );
}

interface TopicPostSectionProps {
  topicId: string;
}

export function TopicPostSection({ topicId }: TopicPostSectionProps) {
  const [page, setPage] = useState(1);
  const [body, setBody] = useState("");
  const { data, isLoading } = useTopicPosts(topicId, { page, limit: 20 });
  const createPost = useCreateTopicPost(topicId);
  const toggleLike = useToggleTopicPostLike();

  const handleSubmit = () => {
    if (!body.trim()) return;
    createPost.mutate(
      { body: body.trim() },
      {
        onSuccess: () => setBody(""),
      },
    );
  };

  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">投稿</h3>

      <div className="space-y-2">
        <Textarea
          placeholder="投稿を入力..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSubmit} disabled={!body.trim() || createPost.isPending}>
            {createPost.isPending ? "投稿中..." : "投稿"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ投稿はありません</p>
      ) : (
        <div className="space-y-4">
          {data?.data.map((post) => (
            <PostCard key={post.id} post={post} onToggleLike={(id) => toggleLike.mutate(id)} />
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={!meta.hasPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
