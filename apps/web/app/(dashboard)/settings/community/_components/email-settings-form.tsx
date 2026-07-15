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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_FROM_NAME = "Community Platform";
const DEFAULT_REPLY_TO = "noreply@example.com";
const DEFAULT_WELCOME_SUBJECT = "【{{site_name}}】ご登録ありがとうございます";
const DEFAULT_WELCOME_BODY = `{{user_name}} 様

この度は {{site_name}} にご登録いただき、誠にありがとうございます。

ご登録メールアドレス: {{email}}`;

type EmailSettingsFormValues = {
  email_from_name: string;
  email_reply_to: string;
  email_welcome_subject: string;
  email_welcome_body: string;
};

const FORM_KEYS = [
  "email_from_name",
  "email_reply_to",
  "email_welcome_subject",
  "email_welcome_body",
] as const satisfies readonly (keyof EmailSettingsFormValues)[];

const DEFAULT_VALUES: EmailSettingsFormValues = {
  email_from_name: DEFAULT_FROM_NAME,
  email_reply_to: DEFAULT_REPLY_TO,
  email_welcome_subject: DEFAULT_WELCOME_SUBJECT,
  email_welcome_body: DEFAULT_WELCOME_BODY,
};

export function EmailSettingsForm() {
  const t = useTranslations("settings.community");
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting({ silent: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailSettingsSchema = z.object({
    email_from_name: z.string().min(1, t("email.fromName.required")),
    email_reply_to: z.email(t("email.replyTo.invalid")),
    email_welcome_subject: z.string().min(1, t("email.subject.required")),
    email_welcome_body: z.string().min(1, t("email.body.required")),
  });

  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!settings) return;
    const next: EmailSettingsFormValues = { ...DEFAULT_VALUES };
    for (const key of FORM_KEYS) {
      const saved = settings.find((s) => s.key === key)?.value;
      if (saved !== undefined) next[key] = saved;
    }
    form.reset(next);
  }, [settings, form]);

  async function onSubmit(values: EmailSettingsFormValues) {
    if (!settings) return;
    setIsSubmitting(true);

    try {
      const promises = FORM_KEYS.filter(
        (key) => (settings.find((s) => s.key === key)?.value ?? "") !== values[key],
      ).map((key) => updateMutation.mutateAsync({ key, data: { value: values[key] } }));

      if (promises.length === 0) {
        toast.info(t("common.noChanges"));
        return;
      }
      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success(t("email.saved"));
      else if (failed < results.length)
        toast.warning(t("common.partialSaveFailed", { count: failed }));
      else toast.error(t("common.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const resetSubjectToDefault = () => {
    form.setValue("email_welcome_subject", DEFAULT_WELCOME_SUBJECT, { shouldDirty: true });
  };

  const resetBodyToDefault = () => {
    form.setValue("email_welcome_body", DEFAULT_WELCOME_BODY, { shouldDirty: true });
  };

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
        <CardTitle>{t("email.title")}</CardTitle>
        <CardDescription>{t("email.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email_from_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email.fromName.label")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>{t("email.fromName.description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email_reply_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email.replyTo.label")}</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormDescription>{t("email.replyTo.description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h3 className="text-sm font-medium">{t("email.welcome.title")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("email.welcome.description")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("email.welcome.variables")}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {"{{site_name}}"}
                  </code>{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {"{{user_name}}"}
                  </code>{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {"{{email}}"}
                  </code>
                </p>
              </div>

              <FormField
                control={form.control}
                name="email_welcome_subject"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("email.subject.label")}</FormLabel>
                      <ResetButton
                        label={t("email.subject.resetLabel")}
                        title={t("email.subject.resetTitle")}
                        description={t("email.subject.resetDescription")}
                        onConfirm={resetSubjectToDefault}
                      />
                    </div>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email_welcome_body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("email.body.label")}</FormLabel>
                      <ResetButton
                        label={t("email.body.resetLabel")}
                        title={t("email.body.resetTitle")}
                        description={t("email.body.resetDescription")}
                        onConfirm={resetBodyToDefault}
                      />
                    </div>
                    <FormControl>
                      <Textarea rows={10} className="font-mono text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

interface ResetButtonProps {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
}

function ResetButton({ label, title, description, onConfirm }: ResetButtonProps) {
  const t = useTranslations("settings.community");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {label}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("common.resetConfirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
