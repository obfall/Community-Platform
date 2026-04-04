"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useTopic, useUpdateTopic } from "@/hooks/use-board";

const topicSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  body: z.string().min(1, "本文を入力してください"),
  categoryId: z.string().min(1, "カテゴリを選択してください"),
  publishStatus: z.enum(["draft", "published"]),
});

type TopicFormValues = z.infer<typeof topicSchema>;

export default function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: categories } = useCategories();
  const { data: topic, isLoading } = useTopic(id);
  const updateTopic = useUpdateTopic();

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: { title: "", body: "", categoryId: "", publishStatus: "published" },
    values: topic
      ? {
          title: topic.title,
          body: topic.body,
          categoryId: topic.category.id,
          publishStatus: topic.publishStatus as "draft" | "published",
        }
      : undefined,
  });

  const onSubmit = (data: TopicFormValues) => {
    updateTopic.mutate({ id, data }, { onSuccess: () => router.push(`/board/topics/${id}`) });
  };

  if (isLoading) {
    return <div className="h-60 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/board/topics/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          トピックに戻る
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">トピックを編集</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>カテゴリ</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>タイトル</FormLabel>
                <FormControl>
                  <Input placeholder="トピックのタイトル" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>本文</FormLabel>
                <FormControl>
                  <Textarea placeholder="内容を入力..." rows={12} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="publishStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>公開ステータス</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="published">公開</SelectItem>
                    <SelectItem value="draft">下書き</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={updateTopic.isPending}>
              {updateTopic.isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
