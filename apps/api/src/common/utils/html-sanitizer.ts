import sanitizeHtml from "sanitize-html";

/**
 * リッチテキスト保存時のサニタイザ。
 *
 * 許可タグ・属性のホワイトリスト方式で、未知のタグや on* 属性、
 * javascript: スキーム等を除去する。Broadcast.bodyHtml 等の保存前に通す。
 */

// 段落・装飾・リスト・リンク・画像・テーブル・コード系のみ許可
const ALLOWED_TAGS = [
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
];

// タグ別の許可属性。"*" は全タグ共通。
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  "*": ["class"],
};

export function sanitizeRichText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // javascript: / data: 等の危険なスキームを除外
    allowedSchemes: ["http", "https", "mailto", "tel"],
    // <a> に rel="noopener noreferrer" target="_blank" を強制付与
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}
