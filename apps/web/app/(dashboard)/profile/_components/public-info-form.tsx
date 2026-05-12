"use client";

// i18n 化方針: 本ファイル内のラベル・トースト・選択肢ラベルは現状ハードコード日本語のまま残している。
// プロジェクト方針として「i18n は機能（ドメイン）単位で順次対応」としており、profile 機能は別フェーズで
// messages/ja/profile.json + useTranslations("profile") への置換をまとめて行う予定。
// 本ブランチのスコープは members 機能のみのため意図的に未対応。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMyProfile, useUpdatePublicInfo } from "@/hooks/profile/use-profile";
import { useInterestCategories, useReplaceInterests } from "@/hooks/profile/use-interests";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const SPECIALTY_CATEGORIES = [
  {
    label: "IT・テクノロジー",
    children: [
      "Web開発",
      "モバイル開発",
      "AI・機械学習",
      "データサイエンス",
      "セキュリティ",
      "インフラ・クラウド",
    ],
  },
  {
    label: "ビジネス",
    children: [
      "マーケティング",
      "経営・戦略",
      "財務・会計",
      "人事・組織",
      "営業",
      "コンサルティング",
    ],
  },
  {
    label: "デザイン",
    children: ["UI/UXデザイン", "グラフィックデザイン", "映像・動画", "写真"],
  },
  {
    label: "教育",
    children: ["語学教育", "プログラミング教育", "幼児教育", "学校教育", "社会人教育"],
  },
  {
    label: "スポーツ",
    children: [
      "サッカー",
      "バスケットボール",
      "テニス",
      "ヨガ・フィットネス",
      "ランニング",
      "水泳",
      "武道",
    ],
  },
  {
    label: "音楽・芸術",
    children: ["楽器演奏", "作曲・DTM", "絵画", "演劇", "ダンス"],
  },
  {
    label: "医療・健康",
    children: ["医学", "看護", "薬学", "栄養学", "メンタルヘルス"],
  },
  {
    label: "法律・政治",
    children: ["法律", "行政", "国際関係"],
  },
  {
    label: "科学・研究",
    children: ["物理学", "化学", "生物学", "環境科学"],
  },
  {
    label: "ものづくり",
    children: ["建築", "製造", "農業", "料理"],
  },
] as const;

const EVENT_ROLE_OPTIONS = [
  { value: "lecturer", label: "講師" },
  { value: "mc", label: "司会" },
  { value: "interpreter", label: "通訳" },
  { value: "planner", label: "企画" },
  { value: "panelist", label: "パネリスト" },
  { value: "performer", label: "出演" },
] as const;

const publicInfoSchema = z.object({
  nickname: z.string().max(100).optional().or(z.literal("")),
  nicknameKana: z.string().max(100).optional().or(z.literal("")),
  specialties: z.array(z.string()),
  prefecture: z.string().max(50).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  foreignCountry: z.string().max(100).optional().or(z.literal("")),
  foreignCity: z.string().max(100).optional().or(z.literal("")),
  introduction: z.string().optional().or(z.literal("")),
  eventRoles: z.array(z.string()),
  interestCategoryIds: z.array(z.string()),
  isPublic: z.boolean(),
});

type PublicInfoFormValues = z.infer<typeof publicInfoSchema>;

export function PublicInfoForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const { data: profileData, isLoading } = useMyProfile();
  const { data: interestCategories } = useInterestCategories();
  const updateMutation = useUpdatePublicInfo();
  const replaceInterestsMutation = useReplaceInterests();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PublicInfoFormValues>({
    resolver: zodResolver(publicInfoSchema),
    defaultValues: {
      nickname: "",
      nicknameKana: "",
      specialties: [],
      prefecture: "",
      city: "",
      foreignCountry: "",
      foreignCity: "",
      introduction: "",
      eventRoles: [],
      interestCategoryIds: [],
      isPublic: false,
    },
  });

  useEffect(() => {
    if (profileData) {
      const p = profileData.publicInfo;
      form.reset({
        nickname: p?.nickname ?? "",
        nicknameKana: p?.nicknameKana ?? "",
        specialties: p?.specialty ? p.specialty.split(",") : [],
        prefecture: p?.prefecture ?? "",
        city: p?.city ?? "",
        foreignCountry: p?.foreignCountry ?? "",
        foreignCity: p?.foreignCity ?? "",
        introduction: p?.introduction ?? "",
        eventRoles: p?.eventRole ? p.eventRole.split(",") : [],
        interestCategoryIds: profileData.interests.map((i) => i.categoryId),
        isPublic: p?.publicStatus === "public",
      });
    }
  }, [profileData, form]);

  async function onSubmit(values: PublicInfoFormValues) {
    setIsSubmitting(true);
    try {
      const { isPublic, eventRoles, specialties, interestCategoryIds, ...rest } = values;
      const data: Record<string, string | undefined> = {};
      for (const [key, val] of Object.entries(rest)) {
        data[key] = val || undefined;
      }
      data.specialty = specialties.length > 0 ? specialties.join(",") : undefined;
      data.eventRole = eventRoles.length > 0 ? eventRoles.join(",") : undefined;
      await updateMutation.mutateAsync({
        ...data,
        publicStatus: isPublic ? "public" : "private",
      });
      await replaceInterestsMutation.mutateAsync(interestCategoryIds);
      if (returnTo) router.push(returnTo);
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
              name="specialties"
              render={({ field }) => {
                const selected = new Set(field.value);

                const hasChild = (cat: string) =>
                  SPECIALTY_CATEGORIES.find((c) => c.label === cat)?.children.some((ch) =>
                    selected.has(`${cat}/${ch}`),
                  );

                const isCatOpen = (cat: string) => selected.has(cat) || !!hasChild(cat);

                const toggle = (value: string) => {
                  const next = new Set(selected);
                  if (next.has(value)) {
                    next.delete(value);
                    // 親カテゴリを外したら子も外す
                    const cat = SPECIALTY_CATEGORIES.find((c) => c.label === value);
                    if (cat) {
                      cat.children.forEach((ch) => next.delete(`${value}/${ch}`));
                    }
                  } else {
                    next.add(value);
                  }
                  field.onChange(Array.from(next));
                };

                return (
                  <FormItem>
                    <FormLabel>専門分野</FormLabel>
                    <div className="space-y-3 rounded-md border p-4">
                      {SPECIALTY_CATEGORIES.map((cat) => (
                        <div key={cat.label}>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`spec-${cat.label}`}
                              checked={isCatOpen(cat.label)}
                              onCheckedChange={() => toggle(cat.label)}
                            />
                            <label htmlFor={`spec-${cat.label}`} className="text-sm font-medium">
                              {cat.label}
                            </label>
                          </div>
                          {isCatOpen(cat.label) && (
                            <div className="ml-6 mt-2 flex flex-wrap gap-x-4 gap-y-2">
                              {cat.children.map((child) => {
                                const val = `${cat.label}/${child}`;
                                return (
                                  <div key={val} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`spec-${val}`}
                                      checked={selected.has(val)}
                                      onCheckedChange={() => toggle(val)}
                                    />
                                    <label htmlFor={`spec-${val}`} className="text-sm font-normal">
                                      {child}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="prefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>活動拠点（都道府県）</FormLabel>
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
                    <FormLabel>活動拠点（市区町村）</FormLabel>
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
                    <FormLabel>活動拠点・外国（国）</FormLabel>
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
                    <FormLabel>活動拠点・外国（都市）</FormLabel>
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
              name="eventRoles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>イベント役割</FormLabel>
                  <div className="flex flex-wrap gap-4">
                    {EVENT_ROLE_OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`event-role-${opt.value}`}
                          checked={field.value.includes(opt.value)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.value, opt.value]
                              : field.value.filter((v) => v !== opt.value);
                            field.onChange(next);
                          }}
                        />
                        <label htmlFor={`event-role-${opt.value}`} className="text-sm font-normal">
                          {opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interestCategoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>興味分野</FormLabel>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border p-4">
                    {(interestCategories ?? []).map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`interest-${cat.id}`}
                          checked={field.value.includes(cat.id)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.value, cat.id]
                              : field.value.filter((v) => v !== cat.id);
                            field.onChange(next);
                          }}
                        />
                        <label htmlFor={`interest-${cat.id}`} className="text-sm font-normal">
                          {cat.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
              {returnTo && (
                <Link href={returnTo}>
                  <Button type="button" variant="outline">
                    戻る
                  </Button>
                </Link>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
