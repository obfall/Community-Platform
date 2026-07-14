"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/auth/use-auth";
import { authApi } from "@/lib/api/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// --- パスワード変更 ---

function createPasswordSchema(t: (key: string) => string) {
  return z
    .object({
      currentPassword: z.string().min(1, t("settings.validation.currentRequired")),
      newPassword: z.string().min(8, t("settings.validation.newMinLength")),
      confirmPassword: z.string().min(1, t("settings.validation.confirmRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("settings.validation.mismatch"),
      path: ["confirmPassword"],
    });
}

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordSchema>>;

export default function ProfileSettingsPage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { user } = useAuth();

  // --- パスワード変更 ---
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(createPasswordSchema(t)),
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
      toast.success(t("settings.changeSuccess"));
      passwordForm.reset();
      setIsChangingPassword(false);
    },
    onError: () => toast.error(t("settings.changeError")),
  });

  async function onPasswordSubmit(values: PasswordFormValues) {
    changePassword.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("settings.title")}</h2>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("settings.account.email")}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("settings.account.password")}</p>
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
                        <FormLabel>{t("settings.form.currentPassword")}</FormLabel>
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
                        <FormLabel>{t("settings.form.newPassword")}</FormLabel>
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
                        <FormLabel>{t("settings.form.confirmPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={changePassword.isPending}>
                      {changePassword.isPending
                        ? t("settings.changing")
                        : t("settings.changeSubmit")}
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
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                {t("settings.changePasswordButton")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
