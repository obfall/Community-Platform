"use client";

import Link from "next/link";
import { MessageSquare, Eye, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LikeButton } from "./like-button";
import type { BoardPost } from "@/lib/api/types";

interface PostCardProps {
  post: BoardPost;
  onToggleLike: (postId: string) => void;
}

export function PostCard({ post, onToggleLike }: PostCardProps) {
  const initials = post.author.name.slice(0, 2);

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {post.isPinned && <Pin className="h-3.5 w-3.5 text-primary" />}
              <Link
                href={`/board/${post.id}`}
                className="line-clamp-1 font-semibold hover:underline"
              >
                {post.title}
              </Link>
            </div>

            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {post.category && (
                <Badge variant="secondary" className="text-xs">
                  {post.category.name}
                </Badge>
              )}
              {post.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{post.author.name}</span>
              <span>
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {post.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {post.commentCount}
              </span>
              <LikeButton
                liked={post.isLiked}
                count={post.likeCount}
                onToggle={() => onToggleLike(post.id)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
