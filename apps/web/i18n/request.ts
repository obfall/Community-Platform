import { getRequestConfig } from "next-intl/server";

// next-intl の最小構成。MVP は ja 単独運用なので routing は使わず、
// locale を "ja" 固定で返す。将来 en 等を足す場合はここで判定ロジックを追加する。
// （cookie / Accept-Language / User.preferredLocale など参照）
//
// メッセージは feature 単位（common / enums / members ...）にファイル分割しており、
// ここで読み込んでトップレベル名前空間としてまとめて返す。
// 新しい feature を i18n 化する時は messages/<locale>/<feature>.json を足し、
// 下記の NAMESPACES 配列に追加するだけで済む。
const NAMESPACES = [
  "common",
  "enums",
  "members",
  "board",
  "chat",
  "dashboard",
  "events",
  "videos",
  "errors",
  "albums",
  "contents",
  "projects",
  "skills",
  "venues",
  "notifications",
  "shop",
] as const;

export default getRequestConfig(async () => {
  const locale = "ja";
  const modules = await Promise.all(
    NAMESPACES.map(
      (ns) =>
        import(`../messages/${locale}/${ns}.json`) as Promise<{
          default: Record<string, unknown>;
        }>,
    ),
  );
  const messages: Record<string, Record<string, unknown>> = {};
  NAMESPACES.forEach((ns, i) => {
    messages[ns] = modules[i]!.default;
  });
  return { locale, messages };
});
