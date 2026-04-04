"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostForm } from "../../_components/post-form";
import { usePost, useUpdatePost } from "@/hooks/use-board";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: post, isLoading } = usePost(id);
  const updatePost = useUpdatePost();

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/board/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">投稿を編集</h1>
      </div>

      <PostForm
        defaultValues={{
          title: post.title,
          body: post.body,
          categoryId: post.category?.id,
          publishStatus: post.publishStatus as "draft" | "published",
        }}
        onSubmit={(data) => {
          updatePost.mutate({ id, data }, { onSuccess: () => router.push(`/board/${id}`) });
        }}
        isPending={updatePost.isPending}
        submitLabel="更新する"
      />
    </div>
  );
}
