import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-serif-jp",
});

const DEFAULT_TITLE = "Community Platform";
const DEFAULT_DESCRIPTION = "コミュニティプラットフォーム";

export async function generateMetadata(): Promise<Metadata> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  try {
    const res = await fetch(`${apiUrl}/settings/app`, {
      next: { revalidate: 60 },
      // build 時 / API 未起動環境で固まらないよう 3 秒で諦めてデフォルトに fallback する
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`settings fetch failed: ${res.status}`);
    const settings: Array<{ key: string; value: string }> = await res.json();
    const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";
    return {
      title: get("site_name") || DEFAULT_TITLE,
      description: get("site_description") || DEFAULT_DESCRIPTION,
    };
  } catch {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // i18n-ready: locale / messages は next-intl 経由で参照する。MVP では request.ts が
  // ja 固定を返すので常に "ja"。将来 en 等を足したらここを変えずに request.ts だけ拡張する。
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${notoSansJP.variable} ${notoSerifJP.variable}`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
