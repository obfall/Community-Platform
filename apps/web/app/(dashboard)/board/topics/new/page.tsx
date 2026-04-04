"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useCategories, useCreateTopic } from "@/hooks/use-board";

const topicSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  body: z.string().min(1, "本文を入力してください"),
  categoryId: z.string().min(1, "カテゴリを選択してください"),
  publishStatus: z.enum(["draft", "published"]),
});

type TopicFormValues = z.infer<typeof topicSchema>;

function NewTopicForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCategoryId = searchParams.get("categoryId") ?? "";
  const { data: categories } = useCategories();
  const createTopic = useCreateTopic();

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      title: "",
      body: "",
      categoryId: defaultCategoryId,
      publishStatus: "published",
    },
  });

  const onSubmit = (data: TopicFormValues) => {
    createTopic.mutate(data, { onSuccess: () => router.push("/board") });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/board">
          <ArrowLeft className="mr-1 h-4 w-4" />
          掲示板に戻る
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">新規トピック</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>カテゴリ</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <Button type="submit" disabled={createTopic.isPending}>
              {createTopic.isPending ? "作成中..." : "トピックを作成"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function NewTopicPage() {
  return (
    <Suspense>
      <NewTopicForm />
    </Suspense>
  );
}
