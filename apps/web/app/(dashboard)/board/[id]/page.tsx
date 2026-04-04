"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Eye, Pencil, Trash2, Pin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LikeButton } from "../_components/like-button";
import { CommentSection } from "../_components/comment-section";
import { usePost, useDeletePost, useTogglePostLike } from "@/hooks/use-board";
import { useAuth } from "@/hooks/use-auth";

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: post, isLoading } = usePost(id);
  const deletePost = useDeletePost();
  const toggleLike = useTogglePostLike();

  const isAuthor = user?.id === post?.author.id;
  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const canEdit = isAuthor || isAdmin;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        投稿が見つかりません
      </div>
    );
  }

  const initials = post.author.name.slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/board">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1" />
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/board/${id}/edit`}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                編集
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は取り消せません。投稿とすべてのコメントが削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deletePost.mutate(id, { onSuccess: () => router.push("/board") })
                    }
                  >
                    削除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* 投稿コンテンツ */}
      <div>
        <div className="flex items-center gap-2">
          {post.isPinned && <Pin className="h-4 w-4 text-primary" />}
          <h1 className="text-2xl font-bold">{post.title}</h1>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <span className="font-medium">{post.author.name}</span>
            <span className="ml-2 text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
                locale: ja,
              })}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {post.category && <Badge variant="secondary">{post.category.name}</Badge>}
          {post.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</div>

      {/* 添付ファイル */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">添付ファイル</h3>
          <div className="flex flex-wrap gap-2">
            {post.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border px-3 py-1.5 text-sm hover:bg-accent"
              >
                {att.fileName ?? "ファイル"}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* いいね + 閲覧数 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <LikeButton
          liked={post.isLiked}
          count={post.likeCount}
          onToggle={() => toggleLike.mutate(id)}
        />
        <span className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          {post.viewCount}
        </span>
      </div>

      <Separator />

      {/* コメントセクション */}
      <CommentSection postId={id} />
    </div>
  );
}
