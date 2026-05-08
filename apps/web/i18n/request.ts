import { getRequestConfig } from "next-intl/server";

// next-intl の最小構成。MVP は ja 単独運用なので routing は使わず、
// locale を "ja" 固定で返す。将来 en 等を足す場合はここで判定ロジックを追加する。
// （cookie / Accept-Language / User.preferredLocale など参照）
export default getRequestConfig(async () => {
  const locale = "ja";
  return {
    locale,
    messages: ((await import(`../messages/${locale}.json`)) as { default: Record<string, unknown> })
      .default,
  };
});
