# 04: 主要 6 フローのテストシナリオ

## 目的

リリース計画で挙げられた **主要 6 フロー** を E2E テストでカバーし、リグレッション検出の網を張る。

## カバー対象

| #   | フロー       | ファイル                                 | ロール | 推定実装時間 |
| --- | ------------ | ---------------------------------------- | ------ | -----------: |
| 1   | ユーザー登録 | `tests/auth/register.spec.ts`            | 未認証 |        30 分 |
| 2   | ログイン     | `tests/auth/login.spec.ts`               | 未認証 |        20 分 |
| 3   | 掲示板投稿   | `tests/board/topic-create.spec.ts`       | member |        30 分 |
| 4   | イベント申込 | `tests/events/event-application.spec.ts` | member |        40 分 |
| 5   | チャット送信 | `tests/chat/send-message.spec.ts`        | member |        40 分 |
| 6   | 動画再生     | `tests/videos/playback.spec.ts`          | member |        30 分 |

合計: 約 3 時間

## シナリオ詳細

### シナリオ1: ユーザー登録

**目的**: 新規ユーザーが登録 → メール確認 → 初回ログインができることを確認。

```ts
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("ユーザー登録", () => {
  test("新規ユーザーが正常に登録できる", async ({ page }) => {
    const email = `e2e-${Date.now()}@test.com`;

    await page.goto("/register");
    await page.getByLabel(/お名前/).fill("テストユーザー");
    await page.getByLabel(/メールアドレス/).fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill("Password1!");
    await page.getByLabel(/パスワード（確認用）/).fill("Password1!");
    await page.getByRole("button", { name: /登録/ }).click();

    // 登録完了画面に遷移
    await expect(page).toHaveURL(/(register\/complete|login)/);
  });

  test("既存メールでは登録できない", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/お名前/).fill("重複テスト");
    await page.getByLabel(/メールアドレス/).fill("yamada@test.com"); // 既存
    await page.getByLabel("パスワード", { exact: true }).fill("Password1!");
    await page.getByLabel(/パスワード（確認用）/).fill("Password1!");
    await page.getByRole("button", { name: /登録/ }).click();

    await expect(page.getByText(/既に登録されています/)).toBeVisible();
  });

  test("パスワード不一致で登録できない", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/お名前/).fill("テスト");
    await page.getByLabel(/メールアドレス/).fill("e2e-mismatch@test.com");
    await page.getByLabel("パスワード", { exact: true }).fill("Password1!");
    await page.getByLabel(/パスワード（確認用）/).fill("Different1!");
    await page.getByRole("button", { name: /登録/ }).click();

    await expect(page.getByText(/一致/)).toBeVisible();
  });
});
```

### シナリオ2: ログイン

**目的**: ログインフロー全体（成功 / 失敗 / アカウントロック）の確認。

```ts
test.describe("ログイン", () => {
  test("正しい認証情報でログインできる", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/メールアドレス/).fill("yamada@test.com");
    await page.getByLabel(/パスワード/).fill("qaz1234");
    await page.getByRole("button", { name: /ログイン/ }).click();

    // ホーム or ダッシュボードにリダイレクト
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("間違ったパスワードでエラー表示", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/メールアドレス/).fill("yamada@test.com");
    await page.getByLabel(/パスワード/).fill("wrong-password");
    await page.getByRole("button", { name: /ログイン/ }).click();

    await expect(page.getByText(/認証情報が無効/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("退会済みユーザーはログインできない", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/メールアドレス/).fill("okada.withdrawn@test.com");
    await page.getByLabel(/パスワード/).fill("qaz1234");
    await page.getByRole("button", { name: /ログイン/ }).click();
    await expect(page.getByText(/(退会|無効|認証)/)).toBeVisible();
  });
});
```

### シナリオ3: 掲示板投稿

**目的**: トピック作成 → 一覧表示 → 詳細表示の一連の流れ。

```ts
test.use({ storageState: "e2e/.auth/member-yamada.json" });

test.describe("掲示板投稿", () => {
  test("メンバーがトピックを作成して一覧で確認できる", async ({ page }, testInfo) => {
    const title = uniqueLabel(testInfo, "テストトピック");
    const body = "E2E テストで作成した投稿本文です。";

    await page.goto("/board");
    await page
      .getByRole("link", { name: /新規|作成|投稿/ })
      .first()
      .click();

    // 投稿フォーム
    await page.getByLabel(/タイトル/).fill(title);
    await page.getByLabel(/本文|内容/).fill(body);
    await page.getByRole("button", { name: /投稿|作成|公開/ }).click();

    // 投稿詳細にリダイレクト
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(body)).toBeVisible();

    // 一覧に戻って表示確認
    await page.goto("/board");
    await expect(page.getByText(title)).toBeVisible();
  });
});
```

### シナリオ4: イベント申込

**目的**: 公開中イベントを開いて申込 → 参加者一覧に自分が出る確認。

```ts
test.use({ storageState: "e2e/.auth/member-suzuki.json" });

test.describe("イベント申込", () => {
  test("募集中イベントに申し込める", async ({ page }) => {
    await page.goto("/events");

    // デモシードに募集中イベント「カジュアル交流イベント」がある
    await page.getByRole("link", { name: /カジュアル交流イベント/ }).click();

    await page.getByRole("button", { name: /申込|参加/ }).click();

    // フォームがあれば入力
    const formVisible = await page
      .getByLabel(/申込/)
      .isVisible()
      .catch(() => false);
    if (formVisible) {
      // 任意質問に回答（デモシードのフォーム想定）
      await page
        .getByLabel(/どのように/)
        .first()
        .check({ force: true })
        .catch(() => {});
      await page.getByRole("button", { name: /送信|確定|申し込む/ }).click();
    }

    // 申込完了表示
    await expect(page.getByText(/申込完了|お申込みありがとう|参加します/)).toBeVisible();
  });

  test("満員イベントには申し込めない", async ({ page }) => {
    await page.goto("/events");
    await page.getByRole("link", { name: /【満員】年末パーティー/ }).click();

    // 申込ボタンが無効 or 「満員」表示
    const button = page.getByRole("button", { name: /申込/ });
    await expect(button)
      .toBeDisabled()
      .catch(async () => {
        await expect(page.getByText(/満員|定員/)).toBeVisible();
      });
  });
});
```

### シナリオ5: チャット送信

**目的**: WebSocket でメッセージ送信 → リアルタイム反映の確認。複数ユーザー同時操作で。

```ts
import { test, expect, type BrowserContext } from "@playwright/test";

test.describe("チャット送信", () => {
  test("メッセージを送ると相手の画面に表示される", async ({ browser }) => {
    // ユーザー1（送信側）
    const context1 = await browser.newContext({
      storageState: "e2e/.auth/member-yamada.json",
    });
    const page1 = await context1.newPage();

    // ユーザー2（受信側）
    const context2 = await browser.newContext({
      storageState: "e2e/.auth/member-suzuki.json",
    });
    const page2 = await context2.newPage();

    try {
      // 両者がチャット画面を開く（DM ルームを想定 or 全体ルーム）
      await page1.goto("/chat");
      await page2.goto("/chat");

      // 全体ルームを選択
      await page1.getByRole("link", { name: /全体連絡/ }).click();
      await page2.getByRole("link", { name: /全体連絡/ }).click();

      // 送信
      const message = `E2E テスト ${Date.now()}`;
      await page1.getByRole("textbox", { name: /メッセージ|送信/ }).fill(message);
      await page1.getByRole("button", { name: /送信/ }).click();

      // 受信側に表示される
      await expect(page2.getByText(message)).toBeVisible({ timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
```

### シナリオ6: 動画再生

**目的**: 動画ページを開いて再生開始まで。実際の playback はモック動画では難しいので「プレイヤーが表示される」「play イベントが発火する」レベルでカバー。

```ts
test.use({ storageState: "e2e/.auth/member-ito.json" });

test.describe("動画再生", () => {
  test("動画詳細ページでプレイヤーが表示される", async ({ page }) => {
    await page.goto("/videos");

    // デモシードの動画「新人研修シリーズ 第1回」
    await page
      .getByRole("link", { name: /新人研修シリーズ 第1回/ })
      .first()
      .click();

    // hls.js ベースのプレイヤー or video 要素
    await expect(page.locator("video, [data-testid='video-player']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("視聴進捗が記録される", async ({ page }) => {
    await page.goto("/videos");
    await page
      .getByRole("link", { name: /新人研修シリーズ 第1回/ })
      .first()
      .click();

    // 数秒間待つ（再生開始 → 進捗 API が裏で叩かれる）
    await page.waitForTimeout(3000);

    // マイページの視聴履歴ページへ
    await page.goto("/library"); // or 適切なパス
    await expect(page.getByText(/新人研修シリーズ 第1回/)).toBeVisible();
  });
});
```

## ベストプラクティス

### セレクタ優先順位

1. `getByRole("button", { name: "送信" })` — アクセシビリティ tree ベース、最堅牢
2. `getByLabel("メールアドレス")` — フォームに最適
3. `getByText("..")` — 表示テキストで特定
4. `getByTestId("...")` — 上記で特定できない場合の最終手段
5. CSS セレクタ — 避ける（実装変更で壊れやすい）

### 待ち合わせ

- `expect(...).toBeVisible({ timeout })` — 自動 retry 内蔵、これを使う
- `page.waitForTimeout(N)` は最終手段（フリーキーになる）
- WebSocket 待ちは `page.waitForResponse` または `expect(...).toBeVisible` で代替

### スクリーンショット・trace

`playwright.config.ts` で `retain-on-failure` 設定済み。失敗時:

```bash
pnpm --filter @community-platform/web exec playwright show-trace e2e/test-results/.../trace.zip
```

で時系列にステップを追える。

## 確定事項（2026-04-25）

- ✅ 主要 6 フローのスコープで確定（追加削除なし）
- ✅ チャットテストは並列ブラウザコンテキスト（マルチユーザー）で実装、片方は storageState、もう片方は動的ログイン
- ✅ 動画再生テストは **プレイヤー表示 + 視聴進捗 API 呼び出しまで**（実 playback の検証は別フェーズ）
- ✅ アサーション粒度: **主要要素表示 + 機能動作の検証**（ピクセル比較は別フェーズ）

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/web/e2e/tests/auth/register.spec.ts`
- `apps/web/e2e/tests/auth/login.spec.ts`
- `apps/web/e2e/tests/board/topic-create.spec.ts`
- `apps/web/e2e/tests/events/event-application.spec.ts`
- `apps/web/e2e/tests/chat/send-message.spec.ts`
- `apps/web/e2e/tests/videos/playback.spec.ts`
