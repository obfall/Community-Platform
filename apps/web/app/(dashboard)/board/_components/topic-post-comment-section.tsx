"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Heart, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useTopicPostComments,
  useCreateTopicPostComment,
  useToggleTopicPostCommentLike,
} from "@/hooks/use-board";
import type { BoardTopicPostComment } from "@/lib/api/types";

function CommentCard({
  comment,
  isNested,
  onToggleLike,
  onReply,
  replyForm,
}: {
  comment: BoardTopicPostComment;
  isNested?: boolean;
  onToggleLike: (id: string) => void;
  onReply?: (id: string) => void;
  replyForm?: React.ReactNode;
}) {
  const initials = comment.author.name.slice(0, 2);

  return (
    <div className={isNested ? "ml-8 border-l-2 border-muted pl-4" : ""}>
      <div className="flex gap-3">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{comment.author.name}</span>
            <span>
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ja })}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
          <div className="mt-1 flex items-center gap-3">
            <button
              onClick={() => onToggleLike(comment.id)}
              className={`flex items-center gap-1 text-xs ${comment.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className={`h-3 w-3 ${comment.isLiked ? "fill-current" : ""}`} />
              {comment.likeCount > 0 && comment.likeCount}
            </button>
            {!isNested && onReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Reply className="h-3 w-3" />
                返信
              </button>
            )}
          </div>
        </div>
      </div>

      {replyForm}

      {comment.childComments?.map((child) => (
        <CommentCard key={child.id} comment={child} isNested onToggleLike={onToggleLike} />
      ))}
    </div>
  );
}

interface TopicPostCommentSectionProps {
  postId: string;
}

export function TopicPostCommentSection({ postId }: TopicPostCommentSectionProps) {
  const [page, setPage] = useState(1);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const { data, isLoading } = useTopicPostComments(postId, { page, limit: 20 });
  const createComment = useCreateTopicPostComment(postId);
  const toggleLike = useToggleTopicPostCommentLike();

  const handleSubmit = () => {
    if (!body.trim()) return;
    createComment.mutate(
      { body: body.trim(), parentCommentId: replyTo },
      {
        onSuccess: () => {
          setBody("");
          setReplyTo(undefined);
        },
      },
    );
  };

  const meta = data?.meta;

  const inlineReplyForm = (
    <div className="ml-8 mt-2 space-y-2 border-l-2 border-primary/30 pl-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>返信を入力</span>
        <button
          onClick={() => {
            setReplyTo(undefined);
            setBody("");
          }}
          className="text-xs text-primary hover:underline"
        >
          キャンセル
        </button>
      </div>
      <Textarea
        placeholder="返信を入力..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        autoFocus
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSubmit}
          disabled={!body.trim() || createComment.isPending}
        >
          {createComment.isPending ? "投稿中..." : "返信"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {!replyTo && (
        <div className="space-y-2">
          <Textarea
            placeholder="コメントを入力..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSubmit}
              disabled={!body.trim() || createComment.isPending}
            >
              {createComment.isPending ? "投稿中..." : "コメント"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">まだコメントはありません</p>
      ) : (
        <div className="space-y-3">
          {data?.data.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onToggleLike={(id) => toggleLike.mutate(id)}
              onReply={(id) => {
                setReplyTo(id);
                setBody("");
              }}
              replyForm={replyTo === comment.id ? inlineReplyForm : undefined}
            />
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
          <span className="text-xs text-muted-foreground">
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
