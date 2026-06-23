"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { KANA_PATTERN } from "@community-platform/shared";
import { useTranslations } from "next-intl";
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

// 専門分野カテゴリ。label/children はラベルキーの末尾要素として使い、
// 値（保存形式 "親/子"）は従来のラベル文字列のまま維持して互換性を保つ。
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

const EVENT_ROLE_VALUES = [
  "lecturer",
  "mc",
  "interpreter",
  "planner",
  "panelist",
  "performer",
] as const;

function buildPublicInfoSchema(t: (key: string) => string) {
  return z.object({
    nickname: z.string().max(100).optional().or(z.literal("")),
    nicknameKana: z
      .string()
      .max(100)
      .regex(KANA_PATTERN, t("validation.kanaOnly"))
      .optional()
      .or(z.literal("")),
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
}

type PublicInfoFormValues = z.infer<ReturnType<typeof buildPublicInfoSchema>>;

export function PublicInfoForm({ returnTo }: { returnTo?: string }) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tEventRole = useTranslations("enums.eventRole");
  const tSpecialty = useTranslations("profile.publicInfoForm.specialtyCategories");
  const router = useRouter();
  const { data: profileData, isLoading } = useMyProfile();
  const { data: interestCategories } = useInterestCategories();
  const updateMutation = useUpdatePublicInfo();
  const replaceInterestsMutation = useReplaceInterests();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const publicInfoSchema = useMemo(() => buildPublicInfoSchema((k) => t(k)), [t]);

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
        <CardContent className="py-12 text-center text-muted-foreground">
          {tCommon("loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("publicInfoForm.title")}</CardTitle>
        <CardDescription>{t("publicInfoForm.description")}</CardDescription>
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
                    <FormLabel className="text-base">{t("publicInfoForm.isPublicLabel")}</FormLabel>
                    <FormDescription>{t("publicInfoForm.isPublicDescription")}</FormDescription>
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
                    <FormLabel>{t("publicInfoForm.nicknameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("publicInfoForm.nicknamePlaceholder")} {...field} />
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
                    <FormLabel>{t("publicInfoForm.nicknameKanaLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("publicInfoForm.nicknameKanaPlaceholder")} {...field} />
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

                type SpecialtyCategory = (typeof SPECIALTY_CATEGORIES)[number];
                const childValues = (cat: SpecialtyCategory) =>
                  cat.children.map((ch) => `${cat.label}/${ch}`);

                const selectedChildCount = (cat: SpecialtyCategory) =>
                  childValues(cat).filter((v) => selected.has(v)).length;

                // 親の状態: 全選択 = true, 一部選択 = "indeterminate", 未選択 = false
                const parentState = (cat: SpecialtyCategory): boolean | "indeterminate" => {
                  const count = selectedChildCount(cat);
                  if (count === 0) return false;
                  if (count === cat.children.length) return true;
                  return "indeterminate";
                };

                // 子がひとつでも選択されていれば中項目を展開表示する
                const isCatOpen = (cat: SpecialtyCategory) => selectedChildCount(cat) > 0;

                // 親トグル: 全選択 ↔ 全解除
                const toggleParent = (cat: SpecialtyCategory) => {
                  const next = new Set(selected);
                  const values = childValues(cat);
                  if (values.every((v) => next.has(v))) {
                    values.forEach((v) => next.delete(v));
                  } else {
                    values.forEach((v) => next.add(v));
                  }
                  field.onChange(Array.from(next));
                };

                const toggleChild = (value: string) => {
                  const next = new Set(selected);
                  if (next.has(value)) {
                    next.delete(value);
                  } else {
                    next.add(value);
                  }
                  field.onChange(Array.from(next));
                };

                return (
                  <FormItem>
                    <FormLabel>{t("publicInfoForm.specialtyLabel")}</FormLabel>
                    <div className="space-y-3 rounded-md border p-4">
                      {SPECIALTY_CATEGORIES.map((cat) => (
                        <div key={cat.label}>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`spec-${cat.label}`}
                              checked={parentState(cat)}
                              onCheckedChange={() => toggleParent(cat)}
                            />
                            <label htmlFor={`spec-${cat.label}`} className="text-sm font-medium">
                              {tSpecialty(cat.label)}
                            </label>
                          </div>
                          {isCatOpen(cat) && (
                            <div className="ml-6 mt-2 flex flex-wrap gap-x-4 gap-y-2">
                              {cat.children.map((child) => {
                                const val = `${cat.label}/${child}`;
                                return (
                                  <div key={val} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`spec-${val}`}
                                      checked={selected.has(val)}
                                      onCheckedChange={() => toggleChild(val)}
                                    />
                                    <label htmlFor={`spec-${val}`} className="text-sm font-normal">
                                      {tSpecialty(`${cat.label}/${child}`)}
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
                    <FormLabel>{t("publicInfoForm.prefectureLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("publicInfoForm.prefecturePlaceholder")} {...field} />
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
                    <FormLabel>{t("publicInfoForm.cityLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("publicInfoForm.cityPlaceholder")} {...field} />
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
                    <FormLabel>{t("publicInfoForm.foreignCountryLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("publicInfoForm.foreignCountryPlaceholder")}
                        {...field}
                      />
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
                    <FormLabel>{t("publicInfoForm.foreignCityLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("publicInfoForm.foreignCityPlaceholder")} {...field} />
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
                  <FormLabel>{t("publicInfoForm.introductionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("publicInfoForm.introductionPlaceholder")}
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
                  <FormLabel>{t("publicInfoForm.eventRoleLabel")}</FormLabel>
                  <div className="flex flex-wrap gap-4">
                    {EVENT_ROLE_VALUES.map((value) => (
                      <div key={value} className="flex items-center gap-2">
                        <Checkbox
                          id={`event-role-${value}`}
                          checked={field.value.includes(value)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.value, value]
                              : field.value.filter((v) => v !== value);
                            field.onChange(next);
                          }}
                        />
                        <label htmlFor={`event-role-${value}`} className="text-sm font-normal">
                          {tEventRole(value)}
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
                  <FormLabel>{t("publicInfoForm.interestLabel")}</FormLabel>
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
                {isSubmitting ? t("publicInfoForm.saving") : tCommon("save")}
              </Button>
              {returnTo && (
                <Link href={returnTo}>
                  <Button type="button" variant="outline">
                    {tCommon("back")}
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
