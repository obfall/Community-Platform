import { FilterXSS } from "xss";

/**
 * リッチテキスト保存時のサニタイザ。
 *
 * 許可タグ・属性のホワイトリスト方式で、未知のタグや on* 属性、
 * javascript: スキーム等を除去する。Broadcast.bodyHtml 等の保存前に通す。
 *
 * 旧来は `sanitize-html` を使っていたが上流の critical advisory
 * (GHSA-rpr9-rxv7-x643) が未パッチのため `xss` に移行（2026-05-17）。
 * フロント側 (`apps/web/components/safe-html.tsx`) の DOMPurify と
 * 許可タグ・属性は揃えて多重防御の整合性を取る。
 */

// すべての許可タグに共通で許す属性
const COMMON_ATTRS = ["class"];

// xss の `whiteList` はタグごとに許可属性配列を持つ形式。
// safe-html.tsx と ALLOWED_TAGS / 主要 ALLOWED_ATTR を揃える。
const WHITE_LIST: Record<string, string[]> = {
  p: COMMON_ATTRS,
  br: COMMON_ATTRS,
  strong: COMMON_ATTRS,
  em: COMMON_ATTRS,
  u: COMMON_ATTRS,
  s: COMMON_ATTRS,
  h1: COMMON_ATTRS,
  h2: COMMON_ATTRS,
  h3: COMMON_ATTRS,
  h4: COMMON_ATTRS,
  ul: COMMON_ATTRS,
  ol: COMMON_ATTRS,
  li: COMMON_ATTRS,
  blockquote: COMMON_ATTRS,
  a: [...COMMON_ATTRS, "href", "title", "target", "rel"],
  img: [...COMMON_ATTRS, "src", "alt", "width", "height"],
  code: COMMON_ATTRS,
  pre: COMMON_ATTRS,
  table: COMMON_ATTRS,
  thead: COMMON_ATTRS,
  tbody: COMMON_ATTRS,
  tr: COMMON_ATTRS,
  th: COMMON_ATTRS,
  td: COMMON_ATTRS,
};

// 許可スキーム: http(s) / mailto / tel のみ。スキームを持たない相対パス・フラグメントは許可。
const ALLOWED_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  // スキームを含まない場合（相対パス・フラグメント）は許可
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!match) return true;
  return ALLOWED_SCHEMES.includes(match[1] + ":");
}

const sanitizer = new FilterXSS({
  whiteList: WHITE_LIST,
  // 許可外タグは escape ではなく削除（中身のテキストは残る）— sanitize-html のデフォルト挙動と一致
  stripIgnoreTag: true,
  // <script> 等は中身ごと完全に除去
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
  // a の href / img の src は危険スキームをチェック
  onTagAttr: (tag, name, value) => {
    if ((tag === "a" && name === "href") || (tag === "img" && name === "src")) {
      if (!isSafeUrl(value)) {
        // 属性自体を除去
        return "";
      }
    }
    // それ以外は xss のデフォルト処理に委ねる
    return undefined;
  },
});

// <a ...> の開タグに target=_blank / rel=noopener noreferrer を強制付与する。
// xss のフックで属性を書き換える API は無いため、サニタイズ済み HTML の <a> を
// 後処理で書き換える。この時点で attribute は xss により escape 済みなので
// 注入リスクは無い。
function enforceAnchorRel(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_, attrs: string) => {
    let next = attrs;
    if (/\starget=/i.test(next)) {
      next = next.replace(/\starget="[^"]*"/i, ' target="_blank"');
    } else {
      next += ' target="_blank"';
    }
    if (/\srel=/i.test(next)) {
      next = next.replace(/\srel="[^"]*"/i, ' rel="noopener noreferrer"');
    } else {
      next += ' rel="noopener noreferrer"';
    }
    return `<a${next}>`;
  });
}

export function sanitizeRichText(input: string): string {
  return enforceAnchorRel(sanitizer.process(input));
}
