"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryTabs } from "./_components/category-tabs";
import { PostList } from "./_components/post-list";
import { useCategories, usePosts, useTogglePostLike } from "@/hooks/use-board";
import type { PostListQuery } from "@/lib/api/types";

export default function BoardPage() {
  const [query, setQuery] = useState<PostListQuery>({ page: 1, limit: 20 });
  const { data: categories } = useCategories();
  const { data, isLoading } = usePosts(query);
  const toggleLike = useTogglePostLike();

  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">掲示板</h1>
          <p className="mt-1 text-muted-foreground">コミュニティの掲示板</p>
        </div>
        <Button asChild>
          <Link href="/board/new">
            <Plus className="mr-1 h-4 w-4" />
            新規投稿
          </Link>
        </Button>
      </div>

      {categories && categories.length > 0 && (
        <CategoryTabs
          categories={categories}
          selectedId={query.categoryId}
          onSelect={(categoryId) => setQuery((prev) => ({ ...prev, categoryId, page: 1 }))}
        />
      )}

      <PostList
        posts={data?.data ?? []}
        isLoading={isLoading}
        onToggleLike={(id) => toggleLike.mutate(id)}
      />

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            全 {meta.total} 件中 {(meta.page - 1) * meta.limit + 1}〜
            {Math.min(meta.page * meta.limit, meta.total)} 件を表示
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
              disabled={!meta.hasPreviousPage}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              前へ
            </Button>
            <span className="text-sm text-muted-foreground">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
              disabled={!meta.hasNextPage}
            >
              次へ
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
