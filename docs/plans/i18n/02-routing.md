# 11.5-02 フロント next-intl 導入と URL prefix 移行

## ゴール

- next-intl v4 を導入し `<html lang>` を locale で動的化する
- URL を `localePrefix: 'always'` で `/ja/...` `/en/...` 形式にする
- 既存 `app/(auth)`, `app/(dashboard)`, `app/(public)` を `app/[locale]/` 配下に移動する
- middleware.ts を next-intl の `createMiddleware` ベースに書き直し、認証ガードと統合する

## 実装内容

### 1. next-intl の導入

```bash
pnpm add -F web next-intl
```

`apps/web/next.config.ts`:

```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl({
  // 既存の next.config.ts の中身
});
```

### 2. routing と request 設定

`apps/web/i18n/routing.ts`:

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "en"],
  defaultLocale: "ja",
  localePrefix: "always",
});
```

`apps/web/i18n/request.ts`:

```typescript
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.includes(requested as never) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

`apps/web/i18n/navigation.ts`（locale 対応の Link / useRouter / redirect ラッパ）:

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, useRouter, usePathname, getPathname } = createNavigation(routing);
```

### 3. ディレクトリの物理移動

```
apps/web/app/
  (auth)/         →  apps/web/app/[locale]/(auth)/
  (dashboard)/    →  apps/web/app/[locale]/(dashboard)/
  (public)/       →  apps/web/app/[locale]/(public)/
  layout.tsx      →  apps/web/app/[locale]/layout.tsx (lang={locale} を反映)
                  +  apps/web/app/layout.tsx (root、html タグなしで children をそのまま返す)
```

`git mv` で履歴を維持。

ルート `apps/web/app/layout.tsx`（最小化）:

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

`apps/web/app/[locale]/layout.tsx`:

```typescript
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "../providers";
import "../globals.css";

// generateMetadata は既存ロジック踏襲（multi-locale 化は別 PR で）

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className={`${notoSansJP.variable} ${notoSerifJP.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 4. middleware.ts の書き直し

既存 `apps/web/middleware.ts`（24 行の認証ガード）を next-intl ベースに書き換え:

```typescript
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PATHS_RE =
  /^\/(ja|en)\/(dashboard|settings|members|board|notifications|events|projects|videos|chat|skills|shop|albums|venues|surveys|contents|faq|broadcasts|moderation|memos|orientation|schedules|user-library|analytics)/;
const AUTH_PATHS_RE = /^\/(ja|en)\/(login|register|forgot-password|reset-password)/;

export function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  // intl が redirect 応答を返した場合（locale prefix 補完など）はそのまま返す
  if (intlResponse?.headers.get("location")) return intlResponse;

  const { pathname } = request.nextUrl;
  const token = request.cookies.get("accessToken")?.value;
  const locale = pathname.split("/")[1] ?? routing.defaultLocale;

  if (PROTECTED_PATHS_RE.test(pathname) && !token) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_PATHS_RE.test(pathname) && token) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlResponse ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|monitoring|.*\\..*).*)"],
};
```

**`PROTECTED_PATHS_RE` のドメイン名一覧は CLAUDE.md の Feature-based 構成と完全一致させる**。

### 5. 既存リンク / router の置換

`apps/web/components/`、`apps/web/app/`、`apps/web/hooks/` 全体で以下を置換:

| 旧 import                                       | 新 import                                         |
| ----------------------------------------------- | ------------------------------------------------- |
| `import Link from "next/link"`                  | `import { Link } from "@/i18n/navigation"`        |
| `import { useRouter } from "next/navigation"`   | `import { useRouter } from "@/i18n/navigation"`   |
| `import { redirect } from "next/navigation"`    | `import { redirect } from "@/i18n/navigation"`    |
| `import { usePathname } from "next/navigation"` | `import { usePathname } from "@/i18n/navigation"` |

`router.push("/login")` → `router.push("/login")` のままでも next-intl が locale prefix を自動付与する。

### 6. `messages/{locale}.json` の初期スケルトン

`apps/web/messages/ja.json` / `en.json` に最低限のキーだけ用意。本格的な抽出は 11.5-07 で実施。

```json
{
  "common": {
    "loading": "読み込み中...",
    "save": "保存",
    "cancel": "キャンセル"
  }
}
```

### 7. E2E テスト URL の置換

`apps/web/e2e/**/*.spec.ts` の URL リテラル 33 箇所を正規表現に置換:

```typescript
// 旧
await page.goto("/login");
await expect(page).toHaveURL("/dashboard");

// 新
await page.goto("/ja/login");
await expect(page).toHaveURL(/^\/ja\/dashboard/);
```

ヘルパー関数 `apps/web/e2e/helpers/url.ts` を新設して locale を引数で渡せるようにすると保守性◯。

## 触るファイル

- 編集: `apps/web/package.json`, `apps/web/next.config.ts`
- 新規: `apps/web/i18n/{routing,request,navigation}.ts`
- 新規: `apps/web/messages/{ja,en}.json`
- 編集: `apps/web/middleware.ts`
- 移動: `apps/web/app/(auth|dashboard|public)/**` → `apps/web/app/[locale]/(auth|dashboard|public)/**`
- 編集: `apps/web/app/layout.tsx`（root）+ 新規 `apps/web/app/[locale]/layout.tsx`
- 編集: 全 page/component/hook の `next/link`, `next/navigation` import を `@/i18n/navigation` に置換
- 編集: `apps/web/e2e/**/*.spec.ts`

## 完了条件

- [ ] `/` → `/ja` にリダイレクトされる
- [ ] `/en/dashboard` で `<html lang="en">` になる
- [ ] middleware が認証ガードを正しく動作させる（locale prefix 付き redirect）
- [ ] `<Link href="/board">` が現在 locale を保持してリンクする
- [ ] E2E が green
- [ ] 既存全ページが少なくとも構造的に表示される（文字列は ja のまま、これは 11.5-07 で対応）

## 工数

PR 1 / 2 日

## リスク

- ディレクトリ移動が大規模変更になり Git 履歴・PR レビューが大変。**他の Phase 着手前に必ず実施**して以降は派生開発を新構造で進める
- `useRouter`/`Link` の import 置換漏れがあると locale prefix が消える → ESLint ルールで `next/navigation` の Link/useRouter 直接 import を禁止する
