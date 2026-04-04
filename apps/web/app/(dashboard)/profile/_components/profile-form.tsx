"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMyProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const profileSchema = z.object({
  nameKana: z.string().max(100).optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  website: z.string().max(500).optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  occupation: z.string().max(100).optional().or(z.literal("")),
  countryOfOrigin: z.string().max(100).optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { data: profileData, isLoading } = useMyProfile();
  const updateMutation = useUpdateProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nameKana: "",
      bio: "",
      phone: "",
      birthday: "",
      website: "",
      gender: "",
      occupation: "",
      countryOfOrigin: "",
    },
  });

  useEffect(() => {
    if (profileData?.profile) {
      const p = profileData.profile;
      form.reset({
        nameKana: p.nameKana ?? "",
        bio: p.bio ?? "",
        phone: p.phone ?? "",
        birthday: p.birthday ? p.birthday.split("T")[0] : "",
        website: p.website ?? "",
        gender: p.gender ?? "",
        occupation: p.occupation ?? "",
        countryOfOrigin: p.countryOfOrigin ?? "",
      });
    }
  }, [profileData, form]);

  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const data: Record<string, string | undefined> = {};
      for (const [key, val] of Object.entries(values)) {
        data[key] = val || undefined;
      }
      await updateMutation.mutateAsync(data);
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
        <CardTitle>プロフィール</CardTitle>
        <CardDescription>個人情報を編集します</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nameKana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前（カナ）</FormLabel>
                  <FormControl>
                    <Input placeholder="ヤマダ タロウ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>自己紹介</FormLabel>
                  <FormControl>
                    <Textarea placeholder="自己紹介を入力してください" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>電話番号</FormLabel>
                    <FormControl>
                      <Input placeholder="090-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>誕生日</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ウェブサイト</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>性別</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">男性</SelectItem>
                        <SelectItem value="female">女性</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
                        <SelectItem value="prefer_not_to_say">回答しない</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>職業</FormLabel>
                    <FormControl>
                      <Input placeholder="エンジニア" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="countryOfOrigin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>出身国</FormLabel>
                  <FormControl>
                    <Input placeholder="日本" {...field} />
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
