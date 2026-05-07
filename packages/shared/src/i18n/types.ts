// ============================================================
// LocalizedText / LocaleAware 型
// ============================================================
// API 境界で「複数言語の値を1つのオブジェクトにまとめて返す」
// または「単一言語の値とどのロケールで解決されたかを返す」ための型。

import type { Locale } from "./locale";

// 例: { ja: "お知らせ", en: "News" }
// DB 内では translations テーブル分離方式（11.5-04）で持ち、
// API レスポンスに詰め直すときにこの形になる。
export type LocalizedText = Record<Locale, string>;

// 単一言語に解決済みのデータと、そのロケール解決結果のメタ情報。
// fallbackUsed が true なら「要求ロケールに値が無くフォールバックを使った」を示す。
export interface LocaleAware<T> {
  data: T;
  locale: Locale;
  fallbackUsed: boolean;
}
