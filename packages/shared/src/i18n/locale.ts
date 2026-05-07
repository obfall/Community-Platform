// ============================================================
// Locale 定数と型
// ============================================================
// ランタイムのサポート言語は DB の locales テーブルで管理する。
// ここに置くのはコード側で必要な「定数」と「形式バリデーション」のみ。

export type Locale = string;

export const DEFAULT_LOCALE: Locale = "ja";
export const FALLBACK_LOCALE: Locale = "ja";

// 初期サポート言語（locales テーブルのシードと一致させる）
export const INITIAL_SUPPORTED_LOCALES = ["ja", "en"] as const;

// BCP 47 形式（例: ja, en, zh-Hant, pt-BR）の検証用パターン
export const LOCALE_CODE_PATTERN = /^[a-z]{2}(-[A-Z][a-zA-Z]{1,8})?$/;

export function isValidLocaleCode(value: string): boolean {
  return LOCALE_CODE_PATTERN.test(value);
}
