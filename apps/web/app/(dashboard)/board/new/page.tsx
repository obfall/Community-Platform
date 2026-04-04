"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostForm } from "../_components/post-form";
import { useCreatePost } from "@/hooks/use-board";

export default function NewPostPage() {
  const router = useRouter();
  const createPost = useCreatePost();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/board">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">新規投稿</h1>
      </div>

      <PostForm
        onSubmit={(data) => {
          createPost.mutate(data, {
            onSuccess: (post) => router.push(`/board/${post.id}`),
          });
        }}
        isPending={createPost.isPending}
        submitLabel="投稿する"
      />
    </div>
  );
}
