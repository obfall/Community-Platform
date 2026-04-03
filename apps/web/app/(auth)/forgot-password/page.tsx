"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const forgotPasswordSchema = z.object({
  email: z.email("有効なメールアドレスを入力してください"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(values.email);
    } catch {
      // エラーでもメッセージを表示（メールアドレスの存在を漏らさない）
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  }

  if (isSubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>メールを送信しました</CardTitle>
          <CardDescription>
            パスワードリセット用のリンクをメールで送信しました。
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">ログインに戻る</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>パスワードリセット</CardTitle>
        <CardDescription>
          登録済みのメールアドレスを入力してください。 パスワードリセット用のリンクをお送りします。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "送信中..." : "リセットリンクを送信"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          ログインに戻る
        </Link>
      </CardFooter>
    </Card>
  );
}
