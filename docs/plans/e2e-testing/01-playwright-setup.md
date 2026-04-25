# 01: Playwright セットアップ

## 目的

Playwright を新規導入し、最初の smoke test まで動かす。テスト配置・設定・実行方法の基盤を整備。

## 現状調査

- E2E ライブラリ未導入
- E2E テストファイル・設定ファイル全て不在
- Next.js 15 / React 19 / TypeScript 5.9 / pnpm 9 / Turborepo 構成

## 配置方針

### ディレクトリ構成

```
apps/web/
├── e2e/                          ← E2E テスト一式
│   ├── fixtures/
│   │   ├── auth.ts               ← storageState 生成
│   │   └── test-users.ts         ← デモユーザー定数
│   ├── helpers/
│   │   ├── selectors.ts          ← role/testid セレクタ集約
│   │   └── wait-utils.ts         ← 共通 wait ヘルパ
│   ├── tests/
│   │   ├── auth/
│   │   │   ├── register.spec.ts
│   │   │   └── login.spec.ts
│   │   ├── board/
│   │   │   └── topic-create.spec.ts
│   │   ├── events/
│   │   │   └── event-application.spec.ts
│   │   ├── chat/
│   │   │   └── send-message.spec.ts
│   │   └── videos/
│   │       └── playback.spec.ts
│   ├── global-setup.ts           ← スイート開始時の DB リセット
│   ├── playwright.config.ts      ← 設定
│   └── tsconfig.json             ← E2E 用 TS 設定
└── ...
```

`apps/web/e2e/` 配下にまとめる理由:

- フロント側のテストなのでフロントの workspace 内に置くと自然
- `apps/web/package.json` の scripts から呼びやすい
- Turborepo タスクキャッシュとも整合

### tsconfig.json（E2E 専用）

`apps/web/e2e/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "types": ["@playwright/test", "node"]
  },
  "include": ["**/*.ts"]
}
```

apps/web/tsconfig.json の `exclude` に `"e2e"` を追加して、Next.js のビルド対象外にする。

## 実装ステップ

### ステップ1: パッケージ追加

```bash
pnpm --filter @community-platform/web add -D @playwright/test
pnpm --filter @community-platform/web exec playwright install --with-deps chromium
```

`--with-deps` で Linux の依存パッケージも入れる（CI 環境用）。

### ステップ2: `playwright.config.ts`

`apps/web/e2e/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  globalSetup: require.resolve("./global-setup"),
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox / WebKit は Phase 11.5 の対象外、必要時に追加
  ],
});
```

### ステップ3: `global-setup.ts`

`apps/web/e2e/global-setup.ts`:

```ts
import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

export default async function globalSetup(_config: FullConfig) {
  // 1. デモシード再投入（テスト DB を毎回クリーンに）
  if (!process.env.SKIP_DB_RESET) {
    console.log("[global-setup] Resetting demo database...");
    execSync("pnpm --filter @community-platform/api db:reset:demo", {
      stdio: "inherit",
      env: {
        ...process.env,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "playwright-e2e",
      },
    });
  }

  // 2. 認証用 storageState の事前生成（03-auth-helpers.md 参照）
  // ここでは未実装、03 のステップで追加
}
```

### ステップ4: 最初の smoke test

`apps/web/e2e/tests/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("ホームページが表示される", async ({ page }) => {
  await page.goto("/");
  // ログインしてないので /login にリダイレクトされるはず
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /ログイン/i })).toBeVisible();
});

test("ログインページのフォームが表示される", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
  await expect(page.getByLabel(/パスワード/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /ログイン/i })).toBeVisible();
});
```

### ステップ5: スクリプト追加

`apps/web/package.json` に追加:

```json
{
  "scripts": {
    "e2e": "playwright test --config=e2e/playwright.config.ts",
    "e2e:ui": "playwright test --config=e2e/playwright.config.ts --ui",
    "e2e:headed": "playwright test --config=e2e/playwright.config.ts --headed",
    "e2e:debug": "playwright test --config=e2e/playwright.config.ts --debug",
    "e2e:report": "playwright show-report e2e/playwright-report"
  }
}
```

ルート `package.json` にも省略形:

```json
{
  "scripts": {
    "e2e": "pnpm --filter @community-platform/web e2e"
  }
}
```

### ステップ6: webServer 連携（任意）

`playwright.config.ts` に `webServer` を追加すると、テスト実行前に dev サーバを自動起動できる:

```ts
webServer: [
  {
    command: "pnpm --filter @community-platform/api dev",
    port: 4000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  {
    command: "pnpm --filter @community-platform/web dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
],
```

ローカルでは既存の dev サーバを再利用、CI では新規起動。

### ステップ7: ESLint / Prettier 統合

`apps/web/eslint.config.mjs` の ignores に `e2e/test-results/` / `e2e/playwright-report/` を追加（自動生成ファイル）。

`.gitignore` にも追加:

```
apps/web/e2e/test-results/
apps/web/e2e/playwright-report/
apps/web/e2e/.playwright/
```

## テスト方針

### 動作確認

```bash
# 1. デモシード投入済み + dev サーバ起動済み の状態で
pnpm e2e

# 2. UI モードでステップ実行
pnpm e2e:ui

# 3. 失敗時のレポート閲覧
pnpm e2e:report
```

期待: smoke test 2 つが green。

## 確定事項（2026-04-25）

- ✅ テスト配置: `apps/web/e2e/` 配下
- ✅ `webServer` 自動起動を使用（ローカル: 既存 dev 再利用、CI: 新規起動）
- ✅ 対象ブラウザ: **Chromium + Firefox + WebKit + モバイル（iPhone / Android Chrome エミュレーション）**
- ✅ レポート形式: HTML + GitHub Actions Annotations

## projects 設定の修正（マルチブラウザ + モバイル対応）

`playwright.config.ts` の `projects` を以下に変更:

```ts
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
],
```

CI 実行時間が約 5 倍（5 projects）になるため、`workers: 2` で並列化。`fullyParallel: true` も維持。

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/web/e2e/playwright.config.ts`
- `apps/web/e2e/global-setup.ts`
- `apps/web/e2e/tsconfig.json`
- `apps/web/e2e/tests/smoke.spec.ts`
- `apps/web/package.json`（scripts 追加）
- ルート `package.json`（scripts 追加）
- `apps/web/eslint.config.mjs`（ignores 追加）
- `.gitignore`（playwright-report 等）
