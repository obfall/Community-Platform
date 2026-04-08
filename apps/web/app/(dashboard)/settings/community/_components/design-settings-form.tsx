"use client";

import { useEffect, useState } from "react";
import { useAppSettings, useUpdateAppSetting } from "@/hooks/use-app-settings";
import { filesApi } from "@/lib/api/files";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PRIMARY = "#3b82f6";
const DEFAULT_ACCENT = "#8b5cf6";

export function DesignSettingsForm() {
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSetting();

  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
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

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updates: Array<{ key: string; value: string }> = [
        { key: "logo_url", value: logoUrl },
        { key: "favicon_url", value: faviconUrl },
        { key: "primary_color", value: primaryColor },
        { key: "accent_color", value: accentColor },
      ];
      const promises = updates
        .filter((u) => settings.find((s) => s.key === u.key)?.value !== u.value)
        .map((u) => updateMutation.mutateAsync({ key: u.key, data: { value: u.value } }));
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

        {/* プレビュー */}
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-sm font-medium">プレビュー</p>
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

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
