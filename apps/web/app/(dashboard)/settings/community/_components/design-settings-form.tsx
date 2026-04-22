"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
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
  { label: "デフォルト（システム）", value: "" },
  { label: "Noto Sans JP（ゴシック）", value: "var(--font-noto-sans-jp)" },
  { label: "Noto Serif JP（明朝）", value: "var(--font-noto-serif-jp)" },
];
const FONT_VALUES = new Set(FONT_OPTIONS.map((opt) => opt.value));

const designSchema = z.object({
  logo_url: z.string(),
  favicon_url: z.string(),
  primary_color: z.string(),
  accent_color: z.string(),
  header_bg_color: z.string(),
  sidebar_bg_color: z.string(),
  sidebar_accent_color: z.string(),
  font_family: z.string(),
});

type DesignFormValues = z.infer<typeof designSchema>;

const DESIGN_KEYS = [
  "logo_url",
  "favicon_url",
  "primary_color",
  "accent_color",
  "header_bg_color",
  "sidebar_bg_color",
  "sidebar_accent_color",
  "font_family",
] as const satisfies readonly (keyof DesignFormValues)[];

const DEFAULT_VALUES: DesignFormValues = {
  logo_url: "",
  favicon_url: "",
  primary_color: DEFAULT_PRIMARY,
  accent_color: DEFAULT_ACCENT,
  header_bg_color: "",
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
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting({ silent: true });

  const [uploadingLogo, setUploadingLogo] = useState(false);
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
    fieldName: "logo_url" | "favicon_url",
    setUploading: (v: boolean) => void,
  ) => {
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB を超えるファイルはアップロードできません");
      return;
    }
    setUploading(true);
    try {
      const result = await filesApi.upload(file, "image", true);
      if (result.publicUrl) {
        form.setValue(fieldName, result.publicUrl, { shouldDirty: true });
      } else {
        toast.error("URL が取得できませんでした");
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "アップロードに失敗しました";
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
        toast.info("変更はありません");
        return;
      }
      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success("デザイン設定を保存しました");
      else if (failed < results.length) toast.warning(`${failed}件の項目の保存に失敗しました`);
      else toast.error("保存に失敗しました");
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
        <CardContent className="py-12 text-center text-muted-foreground">読み込み中...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>デザイン設定</CardTitle>
        <CardDescription>サイトのロゴ・カラー・フォントをカスタマイズします</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(persist)} className="space-y-6">
            <LogoField
              label="ロゴ画像"
              hint="空欄の場合はサイト名がテキストで表示されます (最大 5MB)"
              url={values.logo_url}
              uploading={uploadingLogo}
              onUpload={(f) => handleUpload(f, "logo_url", setUploadingLogo)}
              onClear={() => form.setValue("logo_url", "", { shouldDirty: true })}
              previewClassName="h-16 w-auto"
              inputId="logo-upload"
            />

            <LogoField
              label="ファビコン"
              hint="ブラウザタブに表示される小さなアイコン (最大 5MB、推奨 32x32 以上)"
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
                      label="プライマリーカラー"
                      description="ボタン・バッジ・リンクなど、主要なアクションや強調表示に使われるメインカラー"
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
                      label="アクセントカラー"
                      description="メニューやボタンにマウスを乗せたとき・選択したときに表示されるハイライト色"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={DEFAULT_ACCENT}
                    />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="header_bg_color"
              render={({ field }) => (
                <FormItem>
                  <ColorField
                    id="header-bg-color"
                    label="ヘッダー背景色"
                    description="文字色は背景の明度から自動で白/黒が選ばれます"
                    value={field.value}
                    onChange={field.onChange}
                    clearable
                  />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">サイドバー</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sidebar_bg_color"
                  render={({ field }) => (
                    <FormItem>
                      <ColorField
                        id="sidebar-bg-color"
                        label="サイドバー背景色"
                        description="文字色は自動"
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
                        label="サイドバー選択時背景色"
                        description="hover / 選択時のハイライト色"
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
                    <Label htmlFor="font-family">フォント</Label>
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
                            <span style={{ fontFamily: opt.value || undefined }}>{opt.label}</span>
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
                    初期化
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>デザイン設定を初期化しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      すべてのデザイン設定がデフォルトに戻ります。この操作は取り消せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>初期化する</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
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
            aria-label="削除"
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
              アップロード
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
            デフォルトに戻す
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
          aria-label={`${label}のカラーピッカー`}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "空欄でデフォルト"}
          className="font-mono"
          aria-label={`${label}のHEX値`}
        />
      </div>
    </div>
  );
}

function PreviewPanel({ values }: { values: DesignFormValues }) {
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
      <p className="text-sm font-medium">プレビュー</p>
      <div
        className="-mx-4 -mt-1 border-b px-4 py-2 text-sm font-bold"
        style={{
          backgroundColor: values.header_bg_color || undefined,
          color: values.header_bg_color ? getContrastForeground(values.header_bg_color) : undefined,
        }}
      >
        ヘッダーのサンプル
      </div>
      <p className="text-sm">
        これは本文のサンプルテキストです。あいうえおカタカナ漢字 ABCDEabcde 12345
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded px-3 py-1.5 text-sm font-medium"
          style={{ backgroundColor: primaryBg, color: primaryFg }}
        >
          プライマリーボタン
        </button>
        <button
          type="button"
          className="rounded px-3 py-1.5 text-sm font-medium"
          style={{ backgroundColor: accentBg, color: accentFg }}
        >
          メニュー項目（hover時）
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
        <p className="mb-1 text-xs opacity-60">サイドバー</p>
        <div className="rounded px-2 py-1 text-sm">通常の項目</div>
        <div
          className="rounded px-2 py-1 text-sm font-medium"
          style={{ backgroundColor: sidebarAccentBg, color: sidebarAccentFg }}
        >
          選択中の項目
        </div>
      </div>
    </div>
  );
}
