"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HighlightedTextProps {
  /** pgroonga_highlight_html が `<span class="keyword">` で囲んだ HTML 文字列 */
  html?: string | null;
  /** html が空の場合のフォールバック（プレーンテキスト） */
  fallback?: string | null;
  /** 描画するタグ。インラインなら span（既定）、ブロックなら div */
  as?: "span" | "div";
  className?: string;
}

/**
 * pgroonga 全文検索のヒット文字列を描画する。
 *
 * SafeHtml はリッチテキスト用で span / class を許可していないため、
 * 検索ハイライト用には許可タグを `<span class="keyword">` のみに絞った
 * 専用コンポーネントを使う（多重防御）。
 *
 * バック側で pgroonga_highlight_html を通しているので生成元は信頼できるが、
 * DB 直接編集や将来のクエリ変更に備えてフロントでも DOMPurify で再サニタイズする。
 */
export function HighlightedText({ html, fallback, as = "span", className }: HighlightedTextProps) {
  const sanitized = useMemo(() => {
    if (!html) return null;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["span"],
      ALLOWED_ATTR: ["class"],
      ALLOW_DATA_ATTR: false,
    });
  }, [html]);

  const Tag = as;
  if (sanitized) {
    return <Tag className={cn(className)} dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }
  return <Tag className={cn(className)}>{fallback ?? ""}</Tag>;
}
