"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMyProfile, useUpdatePublicInfo } from "@/hooks/use-profile";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const publicInfoSchema = z.object({
  nickname: z.string().max(100).optional().or(z.literal("")),
  nicknameKana: z.string().max(100).optional().or(z.literal("")),
  specialty: z.string().max(200).optional().or(z.literal("")),
  prefecture: z.string().max(50).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  foreignCountry: z.string().max(100).optional().or(z.literal("")),
  foreignCity: z.string().max(100).optional().or(z.literal("")),
  introduction: z.string().optional().or(z.literal("")),
  eventRole: z.string().max(50).optional().or(z.literal("")),
  isPublic: z.boolean(),
});

type PublicInfoFormValues = z.infer<typeof publicInfoSchema>;

export function PublicInfoForm() {
  const { data: profileData, isLoading } = useMyProfile();
  const updateMutation = useUpdatePublicInfo();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PublicInfoFormValues>({
    resolver: zodResolver(publicInfoSchema),
    defaultValues: {
      nickname: "",
      nicknameKana: "",
      specialty: "",
      prefecture: "",
      city: "",
      foreignCountry: "",
      foreignCity: "",
      introduction: "",
      eventRole: "",
      isPublic: false,
    },
  });

  useEffect(() => {
    if (profileData?.publicInfo) {
      const p = profileData.publicInfo;
      form.reset({
        nickname: p.nickname ?? "",
        nicknameKana: p.nicknameKana ?? "",
        specialty: p.specialty ?? "",
        prefecture: p.prefecture ?? "",
        city: p.city ?? "",
        foreignCountry: p.foreignCountry ?? "",
        foreignCity: p.foreignCity ?? "",
        introduction: p.introduction ?? "",
        eventRole: p.eventRole ?? "",
        isPublic: p.publicStatus === "public",
      });
    }
  }, [profileData, form]);

  async function onSubmit(values: PublicInfoFormValues) {
    setIsSubmitting(true);
    try {
      const { isPublic, ...rest } = values;
      const data: Record<string, string | undefined> = {};
      for (const [key, val] of Object.entries(rest)) {
        data[key] = val || undefined;
      }
      await updateMutation.mutateAsync({
        ...data,
        publicStatus: isPublic ? "public" : "private",
      });
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
        <CardTitle>公開情報</CardTitle>
        <CardDescription>他のメンバーに公開される情報を編集します</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">プロフィールを公開</FormLabel>
                    <FormDescription>
                      有効にすると公開情報が他のメンバーに表示されます
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ニックネーム</FormLabel>
                    <FormControl>
                      <Input placeholder="表示名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nicknameKana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ニックネーム（カナ）</FormLabel>
                    <FormControl>
                      <Input placeholder="ヒョウジメイ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>専門分野</FormLabel>
                  <FormControl>
                    <Input placeholder="Web開発、デザインなど" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="prefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>都道府県</FormLabel>
                    <FormControl>
                      <Input placeholder="東京都" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>市区町村</FormLabel>
                    <FormControl>
                      <Input placeholder="渋谷区" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="foreignCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>海外（国）</FormLabel>
                    <FormControl>
                      <Input placeholder="国名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="foreignCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>海外（都市）</FormLabel>
                    <FormControl>
                      <Input placeholder="都市名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="introduction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>自己紹介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="他のメンバーに公開される自己紹介文"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>イベント役割</FormLabel>
                  <FormControl>
                    <Input placeholder="スピーカー、運営など" {...field} />
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
