"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentItem } from "./comment-item";
import { useComments, useCreateComment, useToggleCommentLike } from "@/hooks/use-board";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [page, setPage] = useState(1);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const { data, isLoading } = useComments(postId, { page, limit: 20 });
  const createComment = useCreateComment(postId);
  const toggleLike = useToggleCommentLike();

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

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">コメント</h3>

      {/* コメント投稿フォーム */}
      <div className="space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>返信先に対してコメント中</span>
            <button
              onClick={() => setReplyTo(undefined)}
              className="text-xs text-primary hover:underline"
            >
              キャンセル
            </button>
          </div>
        )}
        <Textarea
          placeholder="コメントを入力..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!body.trim() || createComment.isPending}
          >
            {createComment.isPending ? "投稿中..." : "コメント"}
          </Button>
        </div>
      </div>

      {/* コメント一覧 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだコメントはありません</p>
      ) : (
        <div className="space-y-4">
          {data?.data.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onToggleLike={(id) => toggleLike.mutate(id)}
              onReply={(id) => setReplyTo(id)}
            />
          ))}
        </div>
      )}

      {/* ページネーション */}
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
