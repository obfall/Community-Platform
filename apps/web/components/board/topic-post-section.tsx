"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth/use-auth";
import {
  useTopicPosts,
  useCreateTopicPost,
  useUpdateTopicPost,
  useDeleteTopicPost,
  useToggleTopicPostLike,
} from "@/hooks/board/use-board";
import { TopicPostCommentSection } from "./topic-post-comment-section";
import type { BoardTopicPost } from "@/lib/api/types";

function PostCard({
  post,
  onToggleLike,
}: {
  post: BoardTopicPost;
  onToggleLike: (id: string) => void;
}) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const updatePost = useUpdateTopicPost();
  const deletePost = useDeleteTopicPost();
  const initials = post.author.name.slice(0, 2);

  const canEdit = post.author.id === user?.id || user?.role === "owner" || user?.role === "admin";

  const handleEdit = () => {
    setEditBody(post.body);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editBody.trim()) return;
    updatePost.mutate(
      { id: post.id, body: editBody.trim() },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  };

  const handleCancel = () => {
    setEditBody(post.body);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirm("この投稿を削除しますか？")) return;
    deletePost.mutate(post.id);
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{post.author.name}</span>
              <span>
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ja })}
              </span>
            </div>
            {canEdit && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                    <span className="sr-only">メニューを開く</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!editBody.trim() || updatePost.isPending}
                >
                  {updatePost.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm">{post.body}</p>
          )}
        </div>
      </div>

      {!isEditing && (
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
      )}

      {showComments && !isEditing && (
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
