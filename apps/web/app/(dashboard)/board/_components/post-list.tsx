"use client";

import { PostCard } from "./post-card";
import type { BoardPost } from "@/lib/api/types";

interface PostListProps {
  posts: BoardPost[];
  isLoading: boolean;
  onToggleLike: (postId: string) => void;
}

export function PostList({ posts, isLoading, onToggleLike }: PostListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        投稿はまだありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onToggleLike={onToggleLike} />
      ))}
    </div>
  );
}
