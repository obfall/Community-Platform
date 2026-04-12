"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth/use-auth";
import {
  useNotificationPreferences,
  useUpdatePreferences,
} from "@/hooks/notifications/use-notifications";
import { authApi } from "@/lib/api/auth";
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// --- パスワード変更 ---

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
    newPassword: z.string().min(8, "8文字以上で入力してください"),
    confirmPassword: z.string().min(1, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "新しいパスワードが一致しません",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

// --- 通知タイプのラベル ---

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  event: "イベント",
  project: "プロジェクト",
  chat: "チャット",
  board: "掲示板",
  announcement: "お知らせ",
  system: "システム",
};

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { data: preferences } = useNotificationPreferences();
  const updatePreferences = useUpdatePreferences();

  // --- パスワード変更 ---
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
    onSuccess: () => {
      toast.success("パスワードを変更しました");
      passwordForm.reset();
      setIsChangingPassword(false);
    },
    onError: () => toast.error("パスワードの変更に失敗しました"),
  });

  async function onPasswordSubmit(values: PasswordFormValues) {
    changePassword.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  }

  // --- 通知設定 ---
  const handleNotificationToggle = (
    notificationType: string,
    channel: "emailEnabled" | "inAppEnabled",
    checked: boolean,
  ) => {
    if (!preferences) return;
    const updated = preferences.map((p) =>
      p.notificationType === notificationType ? { ...p, [channel]: checked } : p,
    );
    updatePreferences.mutate({
      preferences: updated.map((p) => ({
        notificationType: p.notificationType,
        emailEnabled: p.emailEnabled,
        inAppEnabled: p.inAppEnabled,
        lineEnabled: p.lineEnabled,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">個人設定</h2>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle>アカウント情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">メールアドレス</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-sm font-medium">パスワード</p>
            {isChangingPassword ? (
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="mt-3 space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>現在のパスワード</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>新しいパスワード</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>新しいパスワード（確認）</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={changePassword.isPending}>
                      {changePassword.isPending ? "変更中..." : "変更する"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsChangingPassword(false);
                        passwordForm.reset();
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                パスワードを変更
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle>通知設定</CardTitle>
          <CardDescription>通知の受け取り方法を設定します</CardDescription>
        </CardHeader>
        <CardContent>
          {!preferences || preferences.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              通知設定はまだありません
            </p>
          ) : (
            <div className="space-y-4">
              {preferences.map((pref) => (
                <div key={pref.notificationType}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {NOTIFICATION_TYPE_LABELS[pref.notificationType] ?? pref.notificationType}
                    </p>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pref.inAppEnabled}
                          onCheckedChange={(checked) =>
                            handleNotificationToggle(pref.notificationType, "inAppEnabled", checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">アプリ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pref.emailEnabled}
                          onCheckedChange={(checked) =>
                            handleNotificationToggle(pref.notificationType, "emailEnabled", checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">メール</span>
                      </div>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
