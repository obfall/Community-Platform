"use client";

import { useEffect } from "react";
import { useAppSettings } from "@/hooks/use-app-settings";

/**
 * app_settings の primary_color / accent_color / favicon_url を読み取り
 * 動的に CSS カスタムプロパティとファビコンを適用する。
 *
 * Tailwind v4 の :root にある --primary / --accent を上書きすることで
 * Button などの shadcn コンポーネントの色を変更する。
 */
export function ThemeApplier() {
  const { data: settings } = useAppSettings();

  useEffect(() => {
    if (!settings) return;
    const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";

    const primary = get("primary_color");
    const accent = get("accent_color");
    const faviconUrl = get("favicon_url");

    const root = document.documentElement;

    if (primary) {
      root.style.setProperty("--primary", primary);
    } else {
      root.style.removeProperty("--primary");
    }

    if (accent) {
      root.style.setProperty("--accent", accent);
    } else {
      root.style.removeProperty("--accent");
    }

    // ファビコン
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
