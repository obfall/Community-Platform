"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";

interface SafeHtmlProps {
  html: string;
  className?: string;
}

/**
 * 信頼できない HTML を DOMPurify で再サニタイズして描画する。
 *
 * バックエンドでも sanitize-html を通しているが、
 * 過去データや DB 直接編集に対する多重防御として出力時にも除去する。
 *
 * - "use client" 必須（DOMPurify は DOM API に依存）
 * - 許可タグ・属性はバック側 (apps/api/src/common/utils/html-sanitizer.ts) と一致させる
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "u",
          "s",
          "h1",
          "h2",
          "h3",
          "h4",
          "ul",
          "ol",
          "li",
          "blockquote",
          "a",
          "img",
          "code",
          "pre",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
        ],
        ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "width", "height", "class"],
        ALLOW_DATA_ATTR: false,
      }),
    [html],
  );

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
