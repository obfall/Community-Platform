"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMyProfile, useUpdateProfile } from "@/hooks/profile/use-profile";
import { filesApi } from "@/lib/api/files";
import { profileApi } from "@/lib/api/profile";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";

const OCCUPATION_OPTIONS = [
  { value: "company_employee", label: "会社員" },
  { value: "student", label: "学生" },
  { value: "self_employed", label: "自営業" },
  { value: "homemaker", label: "主婦" },
  { value: "unemployed", label: "無職" },
  { value: "other", label: "その他" },
] as const;

const LANGUAGE_OPTIONS = [{ value: "ja", label: "日本語" }] as const;

const affiliationSchema = z.object({
  organizationName: z.string().max(200).optional().or(z.literal("")),
  department: z.string().max(200).optional().or(z.literal("")),
  jobTitle: z.string().max(200).optional().or(z.literal("")),
});

const profileSchema = z.object({
  nameKana: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  countryOfOrigin: z.string().max(100).optional().or(z.literal("")),
  affiliations: z.array(affiliationSchema),
  language: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profileData, isLoading } = useMyProfile();
  const updateMutation = useUpdateProfile();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const headerUpload = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await filesApi.upload(file, "image", true);
      await updateMutation.mutateAsync({ headerImageUrl: uploaded.publicUrl ?? undefined });
      return uploaded;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
      toast.success("ヘッダー画像を更新しました");
    },
    onError: () => toast.error("画像のアップロードに失敗しました"),
  });

  const handleHeaderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("10MB 以下の画像を選択してください");
      return;
    }
    headerUpload.mutate(file);
  };

  const handleHeaderRemove = async () => {
    await updateMutation.mutateAsync({ headerImageUrl: "" });
    queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
  };

  const avatarUpload = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await filesApi.upload(file, "avatar", true);
      await updateMutation.mutateAsync({ avatarUrl: uploaded.publicUrl ?? undefined });
      return uploaded;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
      toast.success("プロフィール画像を更新しました");
    },
    onError: () => toast.error("画像のアップロードに失敗しました"),
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 以下の画像を選択してください");
      return;
    }
    avatarUpload.mutate(file);
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nameKana: "",
      phone: "",
      birthday: "",
      gender: "",
      occupation: "company_employee",
      countryOfOrigin: "",
      affiliations: [{ organizationName: "", department: "", jobTitle: "" }],
      language: "ja",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "affiliations",
  });

  useEffect(() => {
    if (profileData) {
      const p = profileData.profile;
      const affs = profileData.affiliations ?? [];
      const lang = profileData.languages?.[0]?.languageCode;
      form.reset({
        nameKana: p?.nameKana ?? "",
        phone: p?.phone ?? "",
        birthday: p?.birthday ? p.birthday.split("T")[0] : "",
        gender: p?.gender ?? "",
        occupation: p?.occupation || "company_employee",
        countryOfOrigin: p?.countryOfOrigin ?? "",
        affiliations:
          affs.length > 0
            ? affs.map((a) => ({
                organizationName: a.organizationName,
                department: a.roleDescription ?? "",
                jobTitle: a.title ?? "",
              }))
            : [{ organizationName: "", department: "", jobTitle: "" }],
        language: lang || "ja",
      });
    }
  }, [profileData, form]);

  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const { affiliations, language: _language, ...profileValues } = values;

      // プロフィール保存
      const data: Record<string, string | undefined> = {};
      for (const [key, val] of Object.entries(profileValues)) {
        data[key] = val || undefined;
      }
      await updateMutation.mutateAsync(data);

      // 所属保存
      const validAffiliations = affiliations.filter((a) => a.organizationName);
      await profileApi.replaceAffiliations({
        affiliations: validAffiliations.map((a, i) => ({
          organizationName: a.organizationName!,
          roleDescription: a.department || undefined,
          title: a.jobTitle || undefined,
          sortOrder: i,
        })),
      });

      queryClient.invalidateQueries({ queryKey: ["users", "me", "profile"] });
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
        <CardTitle>プロフィール</CardTitle>
        <CardDescription>個人情報を編集します</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ヘッダー画像 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ヘッダー画像</Label>
              <input
                ref={headerInputRef}
                type="file"
                accept="image/*"
                onChange={handleHeaderSelect}
                className="hidden"
              />
              {profileData?.profile?.headerImageUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profileData.profile.headerImageUrl}
                    alt="ヘッダー画像"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  {headerUpload.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => headerInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleHeaderRemove}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => headerInputRef.current?.click()}
                  disabled={headerUpload.isPending}
                  className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50"
                >
                  {headerUpload.isPending ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImagePlus className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm">ヘッダー画像をアップロード</p>
                    </div>
                  )}
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP（10MB以下）推奨サイズ: 1200x300px
              </p>
            </div>

            {/* アバター */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage
                    src={profileData?.profile?.avatarUrl ?? undefined}
                    alt="プロフィール画像"
                  />
                  <AvatarFallback className="text-3xl">
                    {profileData?.name?.slice(0, 2) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                {avatarUpload.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUpload.isPending}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  画像を変更
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP（5MB以下）</p>
              </div>
            </div>

            {/* メールアドレス（読み取り専用） */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">メールアドレス</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                変更は
                <Link href="/profile/settings" className="text-primary hover:underline">
                  個人設定
                </Link>
                から行えます
              </p>
            </div>

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

            {/* 職業（ラジオボタン） */}
            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>職業</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-wrap gap-4"
                    >
                      {OCCUPATION_OPTIONS.map((opt) => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} id={`occupation-${opt.value}`} />
                          <Label htmlFor={`occupation-${opt.value}`} className="font-normal">
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 所属・部署・肩書 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">所属 / 部署 / 肩書</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ organizationName: "", department: "", jobTitle: "" })}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  追加
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-3">
                  <div className="grid flex-1 gap-3 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`affiliations.${index}.organizationName`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel className="text-xs">所属</FormLabel>}
                          <FormControl>
                            <Input placeholder="株式会社〇〇" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`affiliations.${index}.department`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel className="text-xs">部署</FormLabel>}
                          <FormControl>
                            <Input placeholder="開発部" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`affiliations.${index}.jobTitle`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel className="text-xs">肩書</FormLabel>}
                          <FormControl>
                            <Input placeholder="エンジニア" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`shrink-0 text-muted-foreground hover:text-destructive ${index === 0 ? "mt-6" : ""}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* 使用言語 */}
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>使用言語</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
