import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${notoSansJP.variable} ${notoSerifJP.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
