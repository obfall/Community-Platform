"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useTranslations } from "next-intl";
import { useAppSettings, useUpdateAppSetting } from "@/hooks/settings/use-app-settings";
import { filesApi } from "@/lib/api/files";
import { getContrastForeground } from "@/lib/utils/color";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PRIMARY = "#171717";
const DEFAULT_ACCENT = "#f5f5f5";
const COLOR_EMPTY_FALLBACK = "#cccccc";

const FONT_OPTIONS = [
  { labelKey: "default", value: "" },
  { labelKey: "sansJp", value: "var(--font-noto-sans-jp)" },
  { labelKey: "serifJp", value: "var(--font-noto-serif-jp)" },
] as const;
const FONT_VALUES = new Set<string>(FONT_OPTIONS.map((opt) => opt.value));

const designSchema = z.object({
  favicon_url: z.string(),
  primary_color: z.string(),
  accent_color: z.string(),
  header_bg_color: z.string(),
  header_text_color: z.string(),
  sidebar_bg_color: z.string(),
  sidebar_accent_color: z.string(),
  font_family: z.string(),
});

type DesignFormValues = z.infer<typeof designSchema>;

const DESIGN_KEYS = [
  "favicon_url",
  "primary_color",
  "accent_color",
  "header_bg_color",
  "header_text_color",
  "sidebar_bg_color",
  "sidebar_accent_color",
  "font_family",
] as const satisfies readonly (keyof DesignFormValues)[];

const DEFAULT_VALUES: DesignFormValues = {
  favicon_url: "",
  primary_color: DEFAULT_PRIMARY,
  accent_color: DEFAULT_ACCENT,
  header_bg_color: "",
  header_text_color: "",
  sidebar_bg_color: "",
  sidebar_accent_color: "",
  font_family: "",
};

const RESET_VALUES: DesignFormValues = {
  ...DEFAULT_VALUES,
  primary_color: DEFAULT_PRIMARY,
  accent_color: DEFAULT_ACCENT,
};

export function DesignSettingsForm() {
  const t = useTranslations("settings.community");
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting({ silent: true });

  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<DesignFormValues>({
    resolver: zodResolver(designSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!settings) return;
    const next: DesignFormValues = { ...DEFAULT_VALUES };
    for (const key of DESIGN_KEYS) {
      const saved = settings.find((s) => s.key === key)?.value;
      if (saved !== undefined && saved !== "") next[key] = saved;
    }
    form.reset(next);
  }, [settings, form]);

  const values = form.watch();

  const handleUpload = async (
    file: File,
    fieldName: "favicon_url",
    setUploading: (v: boolean) => void,
  ) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("design.errors.notImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("design.errors.tooLarge"));
      return;
    }
    setUploading(true);
    try {
      const result = await filesApi.upload(file, "image", true);
      if (result.publicUrl) {
        form.setValue(fieldName, result.publicUrl, { shouldDirty: true });
      } else {
        toast.error(t("design.errors.noUrl"));
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("design.errors.uploadFailed");
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const persist = async (targetValues: DesignFormValues) => {
    if (!settings) return;
    setSaving(true);
    try {
      const promises = DESIGN_KEYS.filter(
        (key) => (settings.find((s) => s.key === key)?.value ?? "") !== targetValues[key],
      ).map((key) => updateMutation.mutateAsync({ key, data: { value: targetValues[key] } }));
      if (promises.length === 0) {
        toast.info(t("common.noChanges"));
        return;
      }
      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success(t("design.saved"));
      else if (failed < results.length)
        toast.warning(t("common.partialSaveFailed", { count: failed }));
      else toast.error(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    form.reset(RESET_VALUES);
    await persist(RESET_VALUES);
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
        <CardTitle>{t("design.title")}</CardTitle>
        <CardDescription>{t("design.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(persist)} className="space-y-6">
            <LogoField
              label={t("design.favicon.label")}
              hint={t("design.favicon.hint")}
              url={values.favicon_url}
              uploading={uploadingFavicon}
              onUpload={(f) => handleUpload(f, "favicon_url", setUploadingFavicon)}
              onClear={() => form.setValue("favicon_url", "", { shouldDirty: true })}
              previewClassName="h-8 w-8"
              inputId="favicon-upload"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="primary_color"
                render={({ field }) => (
                  <FormItem>
                    <ColorField
                      id="primary-color"
                      label={t("design.primaryColor.label")}
                      description={t("design.primaryColor.description")}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={DEFAULT_PRIMARY}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accent_color"
                render={({ field }) => (
                  <FormItem>
                    <ColorField
                      id="accent-color"
                      label={t("design.accentColor.label")}
                      description={t("design.accentColor.description")}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={DEFAULT_ACCENT}
                    />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="header_bg_color"
                render={({ field }) => (
                  <FormItem>
                    <ColorField
                      id="header-bg-color"
                      label={t("design.headerBg.label")}
                      description={t("design.headerBg.description")}
                      value={field.value}
                      onChange={field.onChange}
                      clearable
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="header_text_color"
                render={({ field }) => (
                  <FormItem>
                    <ColorField
                      id="header-text-color"
                      label={t("design.logoText.label")}
                      description={t("design.logoText.description")}
                      value={field.value}
                      onChange={field.onChange}
                      clearable
                    />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">{t("design.sidebar.title")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sidebar_bg_color"
                  render={({ field }) => (
                    <FormItem>
                      <ColorField
                        id="sidebar-bg-color"
                        label={t("design.sidebarBg.label")}
                        description={t("design.sidebarBg.description")}
                        value={field.value}
                        onChange={field.onChange}
                        clearable
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sidebar_accent_color"
                  render={({ field }) => (
                    <FormItem>
                      <ColorField
                        id="sidebar-accent-color"
                        label={t("design.sidebarAccent.label")}
                        description={t("design.sidebarAccent.description")}
                        value={field.value}
                        onChange={field.onChange}
                        clearable
                      />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="font_family"
              render={({ field }) => {
                const selectValue = FONT_VALUES.has(field.value)
                  ? field.value || "__default__"
                  : "__default__";
                return (
                  <FormItem>
                    <Label htmlFor="font-family">{t("design.font.label")}</Label>
                    <Select
                      value={selectValue}
                      onValueChange={(v) => field.onChange(v === "__default__" ? "" : v)}
                    >
                      <SelectTrigger id="font-family">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value || "__default__"}
                            value={opt.value || "__default__"}
                          >
                            <span style={{ fontFamily: opt.value || undefined }}>
                              {t(`design.fonts.${opt.labelKey}`)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                );
              }}
            />

            <PreviewPanel values={values} />

            <div className="flex justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={saving}>
                    {t("design.reset")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("design.resetDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("design.resetDialog.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                      {t("common.resetConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

interface LogoFieldProps {
  label: string;
  hint: string;
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
  previewClassName: string;
  inputId: string;
}

function LogoField({
  label,
  hint,
  url,
  uploading,
  onUpload,
  onClear,
  previewClassName,
  inputId,
}: LogoFieldProps) {
  const t = useTranslations("settings.community.design");
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {url && (
        <div className="relative inline-block rounded-md border bg-muted p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className={previewClassName} />
          <button
            type="button"
            onClick={onClear}
            className="absolute -right-2 -top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label={t("remove")}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div>
        <Input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <label htmlFor={inputId}>
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <span>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t("upload")}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}

interface ColorFieldProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clearable?: boolean;
}

function ColorField({
  id,
  label,
  description,
  value,
  onChange,
  placeholder,
  clearable,
}: ColorFieldProps) {
  const t = useTranslations("settings.community.design");
  const colorValue = /^#[0-9a-f]{6}$/i.test(value) ? value : COLOR_EMPTY_FALLBACK;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {t("resetToDefault")}
          </button>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="color"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer p-1"
          aria-label={t("colorPicker", { label })}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("colorPlaceholder")}
          className="font-mono"
          aria-label={t("hexValue", { label })}
        />
      </div>
    </div>
  );
}

function PreviewPanel({ values }: { values: DesignFormValues }) {
  const t = useTranslations("settings.community.design.preview");
  const primaryBg = values.primary_color || DEFAULT_PRIMARY;
  const primaryFg = getContrastForeground(primaryBg);
  const accentBg = values.accent_color || DEFAULT_ACCENT;
  const accentFg = getContrastForeground(accentBg);
  const sidebarAccentBg = values.sidebar_accent_color || DEFAULT_ACCENT;
  const sidebarAccentFg = getContrastForeground(sidebarAccentBg);

  return (
    <div
      className="space-y-3 rounded-lg border p-4"
      style={{
        fontFamily: values.font_family || undefined,
      }}
    >
      <p className="text-sm font-medium">{t("title")}</p>
      <div
        className="-mx-4 -mt-1 border-b px-4 py-2 text-sm font-bold"
        style={{
          backgroundColor: values.header_bg_color || undefined,
          color:
            values.header_text_color ||
            (values.header_bg_color ? getContrastForeground(values.header_bg_color) : undefined),
        }}
      >
        {t("header")}
      </div>
      <p className="text-sm">{t("body")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded px-3 py-1.5 text-sm font-medium"
          style={{ backgroundColor: primaryBg, color: primaryFg }}
        >
          {t("primaryButton")}
        </button>
        <button
          type="button"
          className="rounded px-3 py-1.5 text-sm font-medium"
          style={{ backgroundColor: accentBg, color: accentFg }}
        >
          {t("menuItem")}
        </button>
      </div>
      <div
        className="mt-2 rounded border p-2"
        style={{
          backgroundColor: values.sidebar_bg_color || undefined,
          color: values.sidebar_bg_color
            ? getContrastForeground(values.sidebar_bg_color)
            : undefined,
        }}
      >
        <p className="mb-1 text-xs opacity-60">{t("sidebar")}</p>
        <div className="rounded px-2 py-1 text-sm">{t("normalItem")}</div>
        <div
          className="rounded px-2 py-1 text-sm font-medium"
          style={{ backgroundColor: sidebarAccentBg, color: sidebarAccentFg }}
        >
          {t("selectedItem")}
        </div>
      </div>
    </div>
  );
}
