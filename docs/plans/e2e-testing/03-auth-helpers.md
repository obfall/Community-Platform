# 03: 認証ヘルパー

## 目的

各テストの先頭で毎回ログイン UI を踏むと遅い。**事前にログイン済みの状態（storageState）をファイルに保存**しておき、テスト開始時にそれを読み込んで認証スキップする。

ログイン UI 自体のテストは別途残し、ロール別のショートカット認証で他のテストを高速化。

## 現状調査

- `apps/web/lib/auth.ts`:
  - `setTokens(accessToken, refreshToken)`: localStorage と Cookie に保存
  - `getAccessToken()`: 取得
  - `clearTokens()`: 削除
- ログイン API `POST /api/auth/login` で accessToken / refreshToken が JSON で返る想定
- フロントは `accessToken` を Authorization ヘッダ送信、Cookie にも複製（next-server 用？要確認）

## storageState とは

Playwright は **ブラウザの localStorage / sessionStorage / Cookie の状態**を JSON ファイルに保存・復元できる:

```ts
// 1 回だけログイン UI を踏んで保存
await page.goto("/login");
await page.fill('[name="email"]', "yamada@test.com");
await page.fill('[name="password"]', "qaz1234");
await page.click('button[type="submit"]');
await page.waitForURL("/");
await context.storageState({ path: ".auth/yamada.json" });

// 以降のテストでは読み込むだけ
test.use({ storageState: ".auth/yamada.json" });
test("掲示板に投稿できる", async ({ page }) => {
  await page.goto("/board"); // 既にログイン済みの状態
  // ...
});
```

これでテストごとに 2〜3 秒節約できる（× テスト数で大きく効く）。

## 実装方針

### ロール別の事前ログイン

`global-setup` で以下のロールをそれぞれログインして storageState を保存:

| ロール     | ファイル                   | 用途                                 |
| ---------- | -------------------------- | ------------------------------------ |
| sysadmin   | `.auth/sysadmin.json`      | システム管理機能のテスト             |
| owner      | `.auth/owner.json`         | コミュニティ運営機能のテスト         |
| member     | `.auth/member-yamada.json` | 一般メンバーの操作テスト（メイン）   |
| member-2   | `.auth/member-suzuki.json` | 並列実行用（複数テスト同時に投稿等） |
| visitor    | `.auth/visitor.json`       | ビジター権限テスト                   |
| （未認証） | （storageState なし）      | ログイン UI テスト用                 |

### ログイン UI テストとの両立

ログイン機能そのものをテストする時は **storageState を読み込まない**:

```ts
// auth/login.spec.ts
import { test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } }); // クリーンな状態

test("正しいメール・パスワードでログインできる", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/メールアドレス/).fill("yamada@test.com");
  await page.getByLabel(/パスワード/).fill("qaz1234");
  await page.getByRole("button", { name: /ログイン/ }).click();
  await page.waitForURL("/");
});
```

## 実装ステップ

### ステップ1: ログインヘルパー関数

`apps/web/e2e/fixtures/auth.ts`:

```ts
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { TEST_USERS, type TestUserKey } from "./test-users";

export async function loginViaUi(page: Page, userKey: TestUserKey) {
  const user = TEST_USERS[userKey];
  await page.goto("/login");
  await page.getByLabel(/メールアドレス/i).fill(user.email);
  await page.getByLabel(/パスワード/i).fill(user.password);
  await page.getByRole("button", { name: /ログイン/i }).click();
  // ホームへリダイレクトされるまで待つ
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10_000 });
}

export async function saveAuthState(
  browser: Browser,
  userKey: TestUserKey,
  outputPath: string,
): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginViaUi(page, userKey);
  await context.storageState({ path: outputPath });
  await context.close();
}
```

### ステップ2: API 経由のログイン（高速化版・任意）

UI を踏まずに API を叩いて token を取得 → localStorage に直接セット:

```ts
export async function loginViaApi(page: Page, userKey: TestUserKey) {
  const user = TEST_USERS[userKey];
  const apiBase = process.env.E2E_API_BASE ?? "http://localhost:4000/api";
  const res = await page.request.post(`${apiBase}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  const { accessToken, refreshToken } = await res.json();
  await page.goto("/");
  await page.evaluate(
    ([at, rt]) => {
      localStorage.setItem("accessToken", at);
      localStorage.setItem("refreshToken", rt);
    },
    [accessToken, refreshToken],
  );
  // Cookie もセットする場合は context.addCookies で
}
```

API 経由は高速だが、`localStorage.setItem` のキー名が実装と一致している必要がある（`apps/web/lib/auth.ts` を要確認）。**初回は UI 経由**で確実性を取り、必要になったら API 経由に切り替えるのが安全。

### ステップ3: global-setup で storageState 生成

`apps/web/e2e/global-setup.ts` に追加:

```ts
import { chromium, type FullConfig } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import { saveAuthState } from "./fixtures/auth";

export default async function globalSetup(config: FullConfig) {
  // 1. DB リセット（既存）
  // ...

  // 2. .auth ディレクトリ作成
  const authDir = path.join(__dirname, ".auth");
  await fs.mkdir(authDir, { recursive: true });

  // 3. ロール別 storageState 生成
  const browser = await chromium.launch();
  try {
    await saveAuthState(browser, "sysadmin", path.join(authDir, "sysadmin.json"));
    await saveAuthState(browser, "ownerTanaka", path.join(authDir, "owner.json"));
    await saveAuthState(browser, "memberYamada", path.join(authDir, "member-yamada.json"));
    await saveAuthState(browser, "memberSuzuki", path.join(authDir, "member-suzuki.json"));
    await saveAuthState(browser, "visitor", path.join(authDir, "visitor.json"));
  } finally {
    await browser.close();
  }
}
```

### ステップ4: テストでの利用

```ts
// tests/board/topic-create.spec.ts
import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/member-yamada.json" });

test("メンバーは掲示板にトピックを作成できる", async ({ page }) => {
  await page.goto("/board");
  // 既にログイン済みなのでリダイレクトされない
  await page.getByRole("link", { name: /新規トピック/i }).click();
  // ...
});
```

### ステップ5: gitignore

`.gitignore` に追加:

```
apps/web/e2e/.auth/
```

storageState には認証トークンが入るのでコミットしない。

### ステップ6: トークン期限切れ対策

storageState に保存した accessToken は **JWT 15 分有効**。スイートが長引くと期限切れになる。

対策:

- スイート全体を 15 分以内に終わらせる（理想）
- リフレッシュトークンによる自動更新が動くことを確認
- もしくは各テストの先頭で「ログイン状態確認 → 必要なら再ログイン」のヘルパを噛ます

## 確定事項（2026-04-25）

- ✅ 事前ログインは **UI 経由**（フォーム入力）を採用（実装変更に追従しやすい）
- ✅ 生成する storageState は **3 ロール**: `e2e-admin@test.com` / `e2e-owner@test.com` / `e2e-member@test.com`
- ✅ チャットテストなど **2 人の member が必要なテスト** は、片方を storageState で読み込み、もう片方を必要時に動的ログイン
- ✅ トークン期限切れ対策: **スイート全体を 15 分以内に収める**（テスト数・並列度で調整）

## 修正後の global-setup（3 ロール生成）

```ts
import { saveAuthState } from "./fixtures/auth";

await saveAuthState(browser, "e2eAdmin", path.join(authDir, "admin.json"));
await saveAuthState(browser, "e2eOwner", path.join(authDir, "owner.json"));
await saveAuthState(browser, "e2eMember", path.join(authDir, "member.json"));
```

## チャットテスト（2 人 member）の実装パターン

```ts
test.use({ storageState: "e2e/.auth/member.json" });

test("チャット: 2 人の member 間でメッセージ送受信", async ({ browser }) => {
  // ユーザー1（送信側）: storageState を使う
  const context1 = await browser.newContext({
    storageState: "e2e/.auth/member.json",
  });
  const page1 = await context1.newPage();

  // ユーザー2（受信側）: 動的に別の member（demo シードの yamada 等）でログイン
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await loginViaUi(page2, "memberYamada"); // demo シードのユーザーを動的ログイン

  // ... メッセージ送受信テスト
});
```

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/web/e2e/fixtures/auth.ts`（loginViaUi, saveAuthState）
- `apps/web/e2e/global-setup.ts`（storageState 生成追加）
- `apps/web/e2e/.auth/`（ランタイム生成、gitignore）
- `.gitignore`（`.auth/` 追加）
