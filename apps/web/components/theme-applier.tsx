"use client";

import { useEffect } from "react";
import { useAppSettings } from "@/hooks/settings/use-app-settings";

/**
 * app_settings からデザイン関連の値を読み取り、document に動的適用する。
 *
 * 適用対象:
 * - --color-primary / --color-accent: shadcn の Button 等で使用される CSS 変数
 *   (Tailwind v4 では --color-* がトークン名)
 * - --color-background / --color-foreground: ページ全体の背景・文字色
 * - --header-bg / --header-text: ヘッダーで参照するカスタム変数
 * - body の font-family
 * - <link rel="icon"> のファビコン
 *
 * 値が空欄の場合は何もせず、Tailwind のデフォルト値を維持する。
 */
export function ThemeApplier() {
  const { data: settings } = useAppSettings();

  useEffect(() => {
    if (!settings) return;
    const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";

    const root = document.documentElement;

    const apply = (cssVar: string, value: string) => {
      if (value) {
        root.style.setProperty(cssVar, value);
      } else {
        root.style.removeProperty(cssVar);
      }
    };

    // globals.css の `@theme` で Tailwind v4 が bg-primary などを
    // `background-color: var(--color-primary)` として生成するため、
    // :root の CSS 変数を上書きすれば bg-primary などにも反映される。
    apply("--color-primary", get("primary_color"));
    apply("--color-accent", get("accent_color"));
    apply("--color-background", get("background_color"));
    apply("--color-foreground", get("text_color"));
    // サイドバー (shadcn の独自カラー系統)
    apply("--color-sidebar", get("sidebar_bg_color"));
    apply("--color-sidebar-foreground", get("sidebar_text_color"));
    apply("--color-sidebar-accent", get("sidebar_accent_color"));
    apply("--color-sidebar-accent-foreground", get("sidebar_accent_text_color"));
    // ヘッダー専用のカスタム変数
    apply("--header-bg", get("header_bg_color"));
    apply("--header-text", get("header_text_color"));

    // ページ背景・文字色は body と html にも直接適用（保険）
    const bg = get("background_color");
    const fg = get("text_color");
    if (bg) {
      document.body.style.backgroundColor = bg;
      document.documentElement.style.backgroundColor = bg;
    } else {
      document.body.style.removeProperty("background-color");
      document.documentElement.style.removeProperty("background-color");
    }
    if (fg) {
      document.body.style.color = fg;
    } else {
      document.body.style.removeProperty("color");
    }

    // フォント
    const font = get("font_family");
    if (font) {
      document.body.style.fontFamily = font;
    } else {
      document.body.style.removeProperty("font-family");
    }

    // ファビコン
    const faviconUrl = get("favicon_url");
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [settings]);

  return null;
}
