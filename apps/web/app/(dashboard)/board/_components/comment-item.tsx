"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LikeButton } from "./like-button";
import type { BoardComment } from "@/lib/api/types";

interface CommentItemProps {
  comment: BoardComment;
  onToggleLike: (commentId: string) => void;
  onReply?: (commentId: string) => void;
  isNested?: boolean;
}

export function CommentItem({ comment, onToggleLike, onReply, isNested }: CommentItemProps) {
  const initials = comment.author.name.slice(0, 2);

  return (
    <div className={`${isNested ? "ml-10 border-l pl-4" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: ja,
              })}
            </span>
          </div>

          <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>

          <div className="mt-1 flex items-center gap-2">
            <LikeButton
              liked={comment.isLiked}
              count={comment.likeCount}
              onToggle={() => onToggleLike(comment.id)}
            />
            {!isNested && onReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                返信
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 子コメント */}
      {comment.childComments && comment.childComments.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.childComments.map((child) => (
            <CommentItem key={child.id} comment={child} onToggleLike={onToggleLike} isNested />
          ))}
        </div>
      )}
    </div>
  );
}
