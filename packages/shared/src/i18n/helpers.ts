// ============================================================
// Locale ヘルパー関数
// ============================================================

import { FALLBACK_LOCALE, type Locale } from "./locale";
import type { LocalizedText } from "./types";

// LocalizedText から要求ロケールの値を取り出す。
// 1) 要求ロケール → 2) フォールバックロケール → 3) 任意の値 → 4) 空文字
// 呼び出し側で undefined を気にせず常に string が得られる。
export function pickLocalized(
  value: LocalizedText,
  locale: Locale,
  fallback: Locale = FALLBACK_LOCALE,
): string {
  return value[locale] ?? value[fallback] ?? Object.values(value)[0] ?? "";
}
