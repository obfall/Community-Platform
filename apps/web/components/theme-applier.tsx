"use client";

import { useEffect } from "react";
import { useAppSettings } from "@/hooks/settings/use-app-settings";
import { getContrastForeground } from "@/lib/utils/color";

/**
 * app_settings からデザイン関連の値を読み取り、document に動的適用する。
 *
 * ダークモードは非対応。
 *
 * 適用対象:
 * - --color-primary / --color-accent / --color-sidebar / --color-sidebar-accent:
 *   背景色とペアで foreground（文字色）を背景色の明度から自動計算する
 * - --color-background / --color-foreground: ページ全体の背景・文字色
 * - --header-bg: ヘッダー背景色（文字色は header.tsx で自動計算）
 * - body の font-family
 * - <link rel="icon"> のファビコン
 *
 * 値が空欄の場合は CSS 変数を削除し、globals.css のデフォルトに戻す。
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

    const applyPair = (bgVar: string, fgVar: string, bgValue: string) => {
      if (bgValue) {
        root.style.setProperty(bgVar, bgValue);
        root.style.setProperty(fgVar, getContrastForeground(bgValue));
      } else {
        root.style.removeProperty(bgVar);
        root.style.removeProperty(fgVar);
      }
    };

    applyPair("--color-primary", "--color-primary-foreground", get("primary_color"));
    applyPair("--color-accent", "--color-accent-foreground", get("accent_color"));
    applyPair("--color-sidebar", "--color-sidebar-foreground", get("sidebar_bg_color"));
    applyPair(
      "--color-sidebar-accent",
      "--color-sidebar-accent-foreground",
      get("sidebar_accent_color"),
    );

    apply("--color-background", get("background_color"));
    apply("--color-foreground", get("text_color"));
    apply("--header-bg", get("header_bg_color"));

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

    const font = get("font_family");
    if (font) {
      document.body.style.fontFamily = font;
    } else {
      document.body.style.removeProperty("font-family");
    }

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
