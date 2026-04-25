# 05: CI 統合

## 目的

E2E テストを GitHub Actions に組み込み、PR ごとに自動実行。失敗時は trace / video を Artifact として保存して原因究明できるようにする。

## 現状調査

- `.github/workflows/ci.yml`: lint / type-check / test の 3 ジョブ
- ステージング環境なし
- E2E ジョブなし

## 戦略

### CI 実行タイミング

- **全 PR で実行**: 主要 6 シナリオ程度なら 5〜10 分以内に収まるので毎回走らせる
- **main / dev へのマージ時も実行**: マージ後のリグレッション検出
- **夜間バッチは見送り**: 必要になったらスケジュール実行を追加

### 並列度

GitHub-hosted runner（標準: 2 vCPU / 7GB RAM）の制約:

- ローカル: 4 並列
- CI: 2 並列（リソース節約 + 安定性優先）

`playwright.config.ts` の `workers` で制御済（01 で設定）。

### 環境

GitHub Actions の `ubuntu-latest` runner で:

- Postgres 16 をサービスコンテナで起動
- Node.js 22 + pnpm 9
- Playwright ブラウザを apt 経由でセットアップ
- API + Web を CI 内で起動して E2E を実行

### Postgres と pgroonga

E2E 実行時の DB は **Supabase 開発 DB を使わず** GitHub Actions の Postgres コンテナを使用。理由:

- 並列 PR で Supabase 開発 DB が干渉しない
- データリセットを完全制御できる

ただし pgroonga 拡張が必要な場合（Phase 11.1 全文検索後）は **`groonga/pgroonga` イメージ**を使う必要がある:

```yaml
services:
  postgres:
    image: groonga/pgroonga:latest-alpine-17 # pgroonga 同梱
    env: ...
```

Phase 11.5 単独では pgroonga なしで動く範囲のテストに絞る or `groonga/pgroonga` イメージを使うかのどちらか（**確認事項**）。

## 実装ステップ

### ステップ1: 既存 ci.yml の拡張

`.github/workflows/ci.yml` の構成を確認:

```yaml
# 既存（推測）
jobs:
  lint: ...
  type-check: ...
  test: ...
```

### ステップ2: E2E ジョブの追加

`.github/workflows/ci.yml` に追加:

```yaml
e2e:
  name: E2E (Playwright)
  runs-on: ubuntu-latest
  timeout-minutes: 20
  needs: [lint, type-check] # 静的検査が通ってから

  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_PASSWORD: testpass
        POSTGRES_USER: testuser
        POSTGRES_DB: testdb
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  env:
    DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb?schema=public
    DIRECT_URL: postgresql://testuser:testpass@localhost:5432/testdb?schema=public
    JWT_SECRET: test-jwt-secret-for-e2e-only
    JWT_EXPIRATION: 1h
    REFRESH_TOKEN_SECRET: test-refresh-secret
    CORS_ORIGIN: http://localhost:3000
    NEXT_PUBLIC_API_URL: http://localhost:4000/api
    NODE_ENV: test
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: ci-e2e

  steps:
    - uses: actions/checkout@v4

    - uses: pnpm/action-setup@v4
      with:
        version: 9

    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Generate Prisma Client
      run: pnpm --filter @community-platform/api prisma generate

    - name: Apply migrations
      run: pnpm --filter @community-platform/api prisma migrate deploy

    - name: Seed demo data
      run: pnpm --filter @community-platform/api db:seed:demo

    - name: Build Next.js
      run: pnpm --filter @community-platform/web build
      env:
        SKIP_ENV_VALIDATION: true

    - name: Install Playwright browsers
      run: pnpm --filter @community-platform/web exec playwright install --with-deps chromium

    - name: Start API
      run: pnpm --filter @community-platform/api start:prod &
      # nohup でバックグラウンド起動

    - name: Wait for API
      run: npx wait-on tcp:4000 -t 60000

    - name: Start Web
      run: pnpm --filter @community-platform/web start &

    - name: Wait for Web
      run: npx wait-on tcp:3000 -t 120000

    - name: Run Playwright tests
      run: pnpm --filter @community-platform/web e2e
      env:
        PLAYWRIGHT_BASE_URL: http://localhost:3000
        SKIP_DB_RESET: "true" # 既に migrate + seed 済み

    - name: Upload Playwright report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: apps/web/e2e/playwright-report/
        retention-days: 7

    - name: Upload test results (trace/video on failure)
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-test-results
        path: apps/web/e2e/test-results/
        retention-days: 7
```

### ステップ3: テスト用環境変数の管理

E2E 用の secrets / env 変数:

- `JWT_SECRET`: テスト用ダミーで OK
- 外部 API（R2 / Resend / Sentry 等）: モックする or skip する
  - `RESEND_API_KEY=test-key` など
  - 外部送信が動くと CI から実メール飛ぶので禁止

`apps/api/src/config/env.schema.ts` で test 環境のフォールバックを許容しておく。

### ステップ4: ローカル CI 風実行（任意）

`act` で GitHub Actions をローカル再現:

```bash
brew install act  # or scoop install act
act -j e2e
```

CI で動かす前に手元で確認できる。Phase 11.5 着手時は不要、必要時に検討。

### ステップ5: 失敗時のデバッグフロー

1. CI が失敗 → GitHub Actions の Artifact から `playwright-report.zip` をダウンロード
2. 解凍して `index.html` を開く（trace / screenshot / video が見れる）
3. 失敗テストの trace を `playwright show-trace trace.zip` でローカル再現
4. 修正 → push → CI 再実行

### ステップ6: 既存 CI ジョブとの連動

`needs: [lint, type-check]` で静的検査の後に E2E を走らせることで:

- 軽い検査（数秒〜数分）で early failure
- 重い E2E は valid なコードに対してだけ実行
- runner リソース効率化

`needs: [lint, type-check, test]` まで含めるかは要判断。test（Jest）は数分かかるので並列にすると early feedback が早いが、CI 時間は長くなる。

### ステップ7: マージ条件

`.github/branch-protection` または GitHub UI で:

- E2E ジョブを「Required check」に設定
- E2E が通らないと PR がマージできなくなる

ただし最初は **non-required（warning のみ）** で運用して、E2E の安定度を確認してから required に切り替えるのが安全。

## トラブルシューティング

### よくある CI 失敗パターン

1. **タイムアウト**: dev サーバ起動に時間かかりすぎ → `wait-on` のタイムアウト延長
2. **Flaky test**: 待ち合わせ不足 → `expect(...).toBeVisible({ timeout })` の自動 retry を活用
3. **Postgres 接続失敗**: services の health check 待ち不足 → ジョブ最初に `pg_isready` を明示
4. **Playwright バージョン不整合**: `playwright install` のキャッシュ問題 → Node モジュールキャッシュをクリア

## 確定事項（2026-04-25）

- ✅ CI 実行頻度: **main / dev へのマージ時のみ**（PR 中は実行しない）
- ✅ Postgres は GitHub Actions の services コンテナ（`postgres:16`）
- ✅ 並列度: **CI 2 並列**（GitHub-hosted runner のリソース制約）
- ✅ Required check: 最初は **non-required**、安定後に切替
- ✅ 外部 API モック: **MSW（Mock Service Worker）で完全モック**（環境変数ダミーではなく）
- ✅ Artifact 保管期間: **7 日**
- ✅ pgroonga: Phase 11.5 単体では不要、Phase 11.1 全文検索実装後に `groonga/pgroonga` イメージに切替

## ワークフロートリガーの修正

CI 実行を main / dev マージ時のみにするため、`on` セクションを変更:

```yaml
on:
  push:
    branches: [main, dev]
  workflow_dispatch: # 手動実行可
# pull_request トリガーは含めない
```

## マルチブラウザ + モバイル の CI 実行戦略

5 projects（chromium / firefox / webkit / mobile-chrome / mobile-safari）を順次実行すると 5 倍の時間がかかる。

**選択肢**:

- **A**: 全 projects を 1 ジョブで順次実行（並列 2 worker）→ 約 15〜20 分
- **B**: matrix strategy で各 project を別ジョブで並列実行 → 約 5 分（複数 runner 同時消費）

**推奨**: **B（matrix strategy）**。runner 並列消費するが GitHub の標準クォータでは問題なし。

```yaml
e2e:
  strategy:
    fail-fast: false
    matrix:
      project: [chromium, firefox, webkit, mobile-chrome, mobile-safari]
  steps:
    # ... (省略)
    - name: Run Playwright tests
      run: pnpm --filter @community-platform/web e2e --project=${{ matrix.project }}
```

## MSW モック実装方針

`apps/api` 側に MSW Node を組み込み、`NODE_ENV=test` の時に外部 API リクエストを intercept:

```ts
// apps/api/src/test/msw-server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const mswServer = setupServer(
  // R2 アップロード
  http.put("https://*.r2.cloudflarestorage.com/*", () => HttpResponse.text("OK")),
  // Resend メール送信
  http.post("https://api.resend.com/emails", () => HttpResponse.json({ id: "msw-mock-email-id" })),
  // Cloudflare Stream API
  http.post("https://api.cloudflare.com/client/v4/accounts/*/stream", () =>
    HttpResponse.json({ result: { uid: "msw-mock-stream-uid" } }),
  ),
  // ... 他必要に応じて
);

// main.ts で起動時に判定
if (process.env.NODE_ENV === "test") {
  mswServer.listen({ onUnhandledRequest: "warn" });
}
```

## 残確認事項

なし（全項目確定）

## 成果物

- `.github/workflows/ci.yml`（e2e ジョブ追加）
- `apps/api/src/config/env.schema.ts`（test 環境フォールバック対応、必要に応じて）
- README にローカル E2E 実行手順を追加（任意）
