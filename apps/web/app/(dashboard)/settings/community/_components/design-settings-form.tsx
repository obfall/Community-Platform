"use client";

import { useEffect, useState } from "react";
import { useAppSettings, useUpdateAppSetting } from "@/hooks/settings/use-app-settings";
import { filesApi } from "@/lib/api/files";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PRIMARY = "#0a0a0a";
const DEFAULT_ACCENT = "#f3f4f6";

const FONT_OPTIONS = [
  { label: "デフォルト（システム）", value: "" },
  {
    label: "Noto Sans JP（ゴシック・読みやすい）",
    value: "'Noto Sans JP', sans-serif",
  },
  {
    label: "Noto Serif JP（明朝・上品）",
    value: "'Noto Serif JP', serif",
  },
  {
    label: "游ゴシック",
    value: "'Yu Gothic', YuGothic, sans-serif",
  },
  {
    label: "游明朝",
    value: "'Yu Mincho', YuMincho, serif",
  },
  {
    label: "ヒラギノ角ゴ",
    value: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif",
  },
  {
    label: "ヒラギノ明朝",
    value: "'Hiragino Mincho ProN', serif",
  },
  {
    label: "Meiryo",
    value: "Meiryo, sans-serif",
  },
];

export function DesignSettingsForm() {
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting();

  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [headerBgColor, setHeaderBgColor] = useState("");
  const [headerTextColor, setHeaderTextColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [textColor, setTextColor] = useState("");
  const [sidebarBgColor, setSidebarBgColor] = useState("");
  const [sidebarTextColor, setSidebarTextColor] = useState("");
  const [sidebarAccentColor, setSidebarAccentColor] = useState("");
  const [sidebarAccentTextColor, setSidebarAccentTextColor] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [saving, setSaving] = useState(false);

  // 設定読み込み後に初期値をセット
  useEffect(() => {
    if (!settings) return;
    const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";
    setLogoUrl(get("logo_url"));
    setFaviconUrl(get("favicon_url"));
    setPrimaryColor(get("primary_color") || DEFAULT_PRIMARY);
    setAccentColor(get("accent_color") || DEFAULT_ACCENT);
    setHeaderBgColor(get("header_bg_color"));
    setHeaderTextColor(get("header_text_color"));
    setBackgroundColor(get("background_color"));
    setTextColor(get("text_color"));
    setSidebarBgColor(get("sidebar_bg_color"));
    setSidebarTextColor(get("sidebar_text_color"));
    setSidebarAccentColor(get("sidebar_accent_color"));
    setSidebarAccentTextColor(get("sidebar_accent_text_color"));
    setFontFamily(get("font_family"));
  }, [settings]);

  const handleUpload = async (
    file: File,
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void,
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
      if (result.publicUrl) setUrl(result.publicUrl);
      else toast.error("URL が取得できませんでした");
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "アップロードに失敗しました";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const buildUpdates = (): Array<{ key: string; value: string }> => [
    { key: "logo_url", value: logoUrl },
    { key: "favicon_url", value: faviconUrl },
    { key: "primary_color", value: primaryColor },
    { key: "accent_color", value: accentColor },
    { key: "header_bg_color", value: headerBgColor },
    { key: "header_text_color", value: headerTextColor },
    { key: "background_color", value: backgroundColor },
    { key: "text_color", value: textColor },
    { key: "sidebar_bg_color", value: sidebarBgColor },
    { key: "sidebar_text_color", value: sidebarTextColor },
    { key: "sidebar_accent_color", value: sidebarAccentColor },
    { key: "sidebar_accent_text_color", value: sidebarAccentTextColor },
    { key: "font_family", value: fontFamily },
  ];

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updates = buildUpdates();
      const promises = updates
        .filter((u) => settings.find((s) => s.key === u.key)?.value !== u.value)
        .map((u) => updateMutation.mutateAsync({ key: u.key, data: { value: u.value } }));
      await Promise.all(promises);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!settings) return;
    if (!confirm("デザイン設定をすべてデフォルトに戻します。よろしいですか？")) return;

    // フォーム state をリセット
    setLogoUrl("");
    setFaviconUrl("");
    setPrimaryColor(DEFAULT_PRIMARY);
    setAccentColor(DEFAULT_ACCENT);
    setHeaderBgColor("");
    setHeaderTextColor("");
    setBackgroundColor("");
    setTextColor("");
    setSidebarBgColor("");
    setSidebarTextColor("");
    setSidebarAccentColor("");
    setSidebarAccentTextColor("");
    setFontFamily("");

    // 保存
    setSaving(true);
    try {
      const resetValues: Record<string, string> = {
        logo_url: "",
        favicon_url: "",
        primary_color: DEFAULT_PRIMARY,
        accent_color: DEFAULT_ACCENT,
        header_bg_color: "",
        header_text_color: "",
        background_color: "",
        text_color: "",
        sidebar_bg_color: "",
        sidebar_text_color: "",
        sidebar_accent_color: "",
        sidebar_accent_text_color: "",
        font_family: "",
      };
      const promises = Object.entries(resetValues)
        .filter(([key, value]) => settings.find((s) => s.key === key)?.value !== value)
        .map(([key, value]) => updateMutation.mutateAsync({ key, data: { value } }));
      await Promise.all(promises);
    } finally {
      setSaving(false);
    }
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
        <CardDescription>サイトのロゴ・カラーをカスタマイズします</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ロゴ */}
        <div className="space-y-2">
          <Label>ロゴ画像</Label>
          <p className="text-xs text-muted-foreground">
            空欄の場合はサイト名がテキストで表示されます (最大 5MB)
          </p>
          {logoUrl && (
            <div className="relative inline-block rounded-md border bg-muted p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="ロゴ" className="h-16 w-auto" />
              <button
                type="button"
                onClick={() => setLogoUrl("")}
                className="absolute -right-2 -top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="削除"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, setUploadingLogo, setLogoUrl);
                e.target.value = "";
              }}
            />
            <label htmlFor="logo-upload">
              <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} asChild>
                <span>
                  {uploadingLogo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  ロゴをアップロード
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* ファビコン */}
        <div className="space-y-2">
          <Label>ファビコン</Label>
          <p className="text-xs text-muted-foreground">
            ブラウザタブに表示される小さなアイコン (最大 5MB、推奨 32x32 以上)
          </p>
          {faviconUrl && (
            <div className="relative inline-block rounded-md border bg-muted p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faviconUrl} alt="ファビコン" className="h-8 w-8" />
              <button
                type="button"
                onClick={() => setFaviconUrl("")}
                className="absolute -right-2 -top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="削除"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div>
            <Input
              id="favicon-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, setUploadingFavicon, setFaviconUrl);
                e.target.value = "";
              }}
            />
            <label htmlFor="favicon-upload">
              <Button type="button" variant="outline" size="sm" disabled={uploadingFavicon} asChild>
                <span>
                  {uploadingFavicon ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  ファビコンをアップロード
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* カラー */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>プライマリーカラー</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3b82f6"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>アクセントカラー</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#8b5cf6"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* ヘッダー色 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>ヘッダー背景色</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={headerBgColor || "#ffffff"}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={headerBgColor}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                placeholder="空欄でデフォルト"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>ヘッダー文字色</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={headerTextColor || "#000000"}
                onChange={(e) => setHeaderTextColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={headerTextColor}
                onChange={(e) => setHeaderTextColor(e.target.value)}
                placeholder="空欄でデフォルト"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* 背景色・文字色 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>ページ背景色</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={backgroundColor || "#ffffff"}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="空欄でデフォルト"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>本文文字色</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={textColor || "#000000"}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="空欄でデフォルト"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">サイドバー</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>サイドバー背景色</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={sidebarBgColor || "#ffffff"}
                  onChange={(e) => setSidebarBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  type="text"
                  value={sidebarBgColor}
                  onChange={(e) => setSidebarBgColor(e.target.value)}
                  placeholder="空欄でデフォルト"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>サイドバー文字色</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={sidebarTextColor || "#000000"}
                  onChange={(e) => setSidebarTextColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  type="text"
                  value={sidebarTextColor}
                  onChange={(e) => setSidebarTextColor(e.target.value)}
                  placeholder="空欄でデフォルト"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>hover/選択色（背景）</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={sidebarAccentColor || "#f3f4f6"}
                  onChange={(e) => setSidebarAccentColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  type="text"
                  value={sidebarAccentColor}
                  onChange={(e) => setSidebarAccentColor(e.target.value)}
                  placeholder="空欄でデフォルト"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>hover/選択色（文字）</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={sidebarAccentTextColor || "#000000"}
                  onChange={(e) => setSidebarAccentTextColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  type="text"
                  value={sidebarAccentTextColor}
                  onChange={(e) => setSidebarAccentTextColor(e.target.value)}
                  placeholder="空欄でデフォルト"
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* フォント */}
        <div className="space-y-2">
          <Label>フォント</Label>
          <Select
            value={fontFamily || "__default__"}
            onValueChange={(v) => setFontFamily(v === "__default__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__default__"} value={opt.value || "__default__"}>
                  <span style={{ fontFamily: opt.value || undefined }}>{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* プレビュー */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: backgroundColor || undefined,
            color: textColor || undefined,
            fontFamily: fontFamily || undefined,
          }}
        >
          <p className="mb-3 text-sm font-medium">プレビュー</p>
          <div
            className="mb-3 -mx-4 -mt-4 rounded-t-lg border-b px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor: headerBgColor || undefined,
              color: headerTextColor || undefined,
            }}
          >
            ヘッダーのサンプル
          </div>
          <p className="mb-3 text-sm">
            これは本文のサンプルテキストです。あいうえおカタカナ漢字 ABCDEabcde 12345
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              プライマリーボタン
            </button>
            <button
              type="button"
              className="rounded px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              アクセントボタン
            </button>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            初期化
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
