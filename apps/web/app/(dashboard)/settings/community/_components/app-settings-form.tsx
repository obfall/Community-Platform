"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useAppSettings, useUpdateAppSetting } from "@/hooks/use-app-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const appSettingsSchema = z.object({
  site_name: z.string().min(1, "サイト名を入力してください"),
  site_description: z.string().min(1, "サイト説明を入力してください"),
  max_upload_size_mb: z.string().min(1, "値を入力してください"),
  allow_registration: z.boolean(),
  default_language: z.string().min(1, "言語を入力してください"),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

export function AppSettingsForm() {
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      site_name: "",
      site_description: "",
      max_upload_size_mb: "10",
      allow_registration: true,
      default_language: "ja",
    },
  });

  useEffect(() => {
    if (settings) {
      const values: Record<string, string | boolean> = {};
      for (const setting of settings) {
        if (setting.valueType === "boolean") {
          values[setting.key] = setting.value === "true";
        } else {
          values[setting.key] = setting.value;
        }
      }
      form.reset(values as unknown as AppSettingsFormValues);
    }
  }, [settings, form]);

  async function onSubmit(values: AppSettingsFormValues) {
    if (!settings) return;
    setIsSubmitting(true);

    try {
      const promises: Promise<unknown>[] = [];
      for (const setting of settings) {
        const newValue =
          setting.valueType === "boolean"
            ? String(values[setting.key as keyof AppSettingsFormValues])
            : String(values[setting.key as keyof AppSettingsFormValues]);

        if (newValue !== setting.value) {
          promises.push(
            updateMutation.mutateAsync({ key: setting.key, data: { value: newValue } }),
          );
        }
      }
      await Promise.all(promises);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">読み込み中...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>基本設定</CardTitle>
        <CardDescription>コミュニティの基本情報を設定します</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="site_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>サイト名</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>コミュニティの表示名</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>サイト説明</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>コミュニティの説明文</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_upload_size_mb"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最大アップロードサイズ（MB）</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_registration"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">新規登録を許可</FormLabel>
                    <FormDescription>
                      無効にすると新規ユーザーが登録できなくなります
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>デフォルト言語</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
