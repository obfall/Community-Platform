"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useAppSettings, useUpdateAppSetting } from "@/hooks/settings/use-app-settings";
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
import { toast } from "sonner";

const appSettingsSchema = z.object({
  site_name: z.string().min(1, "サイト名を入力してください"),
  site_description: z.string().min(1, "サイト説明を入力してください"),
  allow_registration: z.boolean(),
  default_language: z.string().min(1, "言語を入力してください"),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

const FORM_KEYS = new Set<keyof AppSettingsFormValues>([
  "site_name",
  "site_description",
  "allow_registration",
  "default_language",
]);

export function AppSettingsForm() {
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting({ silent: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      site_name: "",
      site_description: "",
      allow_registration: true,
      default_language: "ja",
    },
  });

  useEffect(() => {
    if (settings) {
      const values: Record<string, string | boolean> = {};
      for (const setting of settings) {
        if (!FORM_KEYS.has(setting.key as keyof AppSettingsFormValues)) continue;
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
        if (!FORM_KEYS.has(setting.key as keyof AppSettingsFormValues)) continue;
        const newValue = String(values[setting.key as keyof AppSettingsFormValues]);

        if (newValue !== setting.value) {
          promises.push(
            updateMutation.mutateAsync({ key: setting.key, data: { value: newValue } }),
          );
        }
      }
      if (promises.length === 0) {
        toast.info("変更はありません");
        return;
      }
      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success("基本設定を保存しました");
      else if (failed < results.length) toast.warning(`${failed}件の項目の保存に失敗しました`);
      else toast.error("保存に失敗しました");
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
                  <FormDescription>
                    Google 検索結果やSNSシェア時に表示される説明文（画面上には直接表示されません）
                  </FormDescription>
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
