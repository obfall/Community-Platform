"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useTranslations } from "next-intl";
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

type AppSettingsFormValues = {
  site_name: string;
  site_description: string;
  allow_registration: boolean;
  default_language: string;
};

const FORM_KEYS = new Set<keyof AppSettingsFormValues>([
  "site_name",
  "site_description",
  "allow_registration",
  "default_language",
]);

export function AppSettingsForm() {
  const t = useTranslations("settings.community");
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting({ silent: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appSettingsSchema = z.object({
    site_name: z.string().min(1, t("app.siteName.required")),
    site_description: z.string().min(1, t("app.siteDescription.required")),
    allow_registration: z.boolean(),
    default_language: z.string().min(1, t("app.defaultLanguage.required")),
  });

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
        toast.info(t("common.noChanges"));
        return;
      }
      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success(t("app.saved"));
      else if (failed < results.length)
        toast.warning(t("common.partialSaveFailed", { count: failed }));
      else toast.error(t("common.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("common.loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("app.title")}</CardTitle>
        <CardDescription>{t("app.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="site_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("app.siteName.label")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>{t("app.siteName.description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("app.siteDescription.label")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>{t("app.siteDescription.description")}</FormDescription>
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
                    <FormLabel className="text-base">{t("app.allowRegistration.label")}</FormLabel>
                    <FormDescription>{t("app.allowRegistration.description")}</FormDescription>
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
                  <FormLabel>{t("app.defaultLanguage.label")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
