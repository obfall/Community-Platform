# 01: 計測基盤の整備

## 目的

「推測で最適化しない、計測で判明したボトルネックを直す」原則を実現するための基盤を整える。スロークエリ・遅い API・大きなバンドル等を **数値で見える化**。

## 現状調査

- ✅ Sentry Performance Monitoring 設定済（API tracesSampleRate 0.2 / Web 1.0）
- ❌ 構造化ログ未導入（Phase 11.3 で pino + nestjs-pino 導入予定）
- ❌ `/metrics` エンドポイント無し
- ❌ Lighthouse CI 未導入
- ✅ ヘルスチェック `/health`, `/api/health` 実装済（DB 疎通確認）

## 整備項目

### 1. リクエスト処理時間ロギング（pino + nestjs-pino）

**Phase 11.3 で導入する nestjs-pino** の `pinoHttp` が自動的にリクエストごとに以下を記録:

```json
{
  "level": "info",
  "time": ...,
  "msg": "request completed",
  "req": { "id": "abc", "method": "GET", "url": "/api/events" },
  "res": { "statusCode": 200 },
  "responseTime": 245
}
```

→ `responseTime` で API レスポンス時間が常時記録される。

#### Phase 11.2 での追加対応

**スロークエリ閾値設定**: `responseTime > 1000ms` 時に `warn` レベルでロギング:

```ts
// apps/api/src/app.module.ts
LoggerModule.forRoot({
  pinoHttp: {
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customAttributeKeys: { responseTime: "duration_ms" },
    customSuccessMessage: (req, res, responseTime) => {
      if (responseTime > 1000) return `slow request: ${req.method} ${req.url}`;
      return "request completed";
    },
  },
});
```

→ 1 秒超のリクエストが `slow request` メッセージで目立つようにマーク。

### 2. Sentry Performance の活用

#### Trace の有効活用

Phase 11.3 / 11.4 で sample rate を 0.1 に下げる予定だが、**ボトルネック調査期間は本番でも 1.0 (全件)** にして十分なデータを集める:

```ts
// 期間限定で本番設定変更
tracesSampleRate: process.env.SENTRY_TRACE_FULL === "true" ? 1.0 : 0.1,
```

`SENTRY_TRACE_FULL=true` を 1〜2 週間設定して計測 → 通常運用時は 0.1 に戻す。

#### Sentry ダッシュボードで見るもの

- **Transactions タブ**: API エンドポイント別の P50 / P95 / P99 レイテンシ
- **Performance Issues**: 自動検出される N+1 / 重いリクエスト
- **Distributed Tracing**: 1 リクエスト内の DB クエリ・外部 API 呼び出しを時系列表示

### 3. Lighthouse CI（フロントエンド計測）

Lighthouse は Web ページのパフォーマンス・アクセシビリティ・SEO を自動計測する Google ツール。

#### 設定

`.github/workflows/lighthouse.yml`（新規）:

```yaml
name: Lighthouse CI
on:
  push:
    branches: [main] # main にマージ時のみ
  workflow_dispatch:

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @community-platform/web build
      - run: pnpm --filter @community-platform/web start &
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/login
          configPath: ./lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

`lighthouserc.json`（新規、ルート）:

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.85 }],
        "categories:seo": ["warn", { "minScore": 0.85 }]
      }
    }
  }
}
```

**結果の見方**:

- Performance < 80: 警告（メインスレッドのブロック / バンドルサイズ過大 等）
- Accessibility < 90: エラー（contrast / aria 等の問題）

main マージ時に自動計測 → ダッシュボードで時系列追跡。

### 4. メトリクスエンドポイント（任意）

本番監視用に Prometheus 互換のメトリクスを露出する場合は `/metrics` エンドポイントを追加。

```bash
pnpm --filter @community-platform/api add @willsoto/nestjs-prometheus prom-client
```

```ts
// apps/api/src/app.module.ts
import { PrometheusModule } from "@willsoto/nestjs-prometheus";

@Module({
  imports: [
    PrometheusModule.register({ path: "/metrics" }),
    // ...
  ],
})
```

→ HTTP リクエスト数 / レイテンシ / エラー率を Prometheus 形式で出力。

ただし **Phase 11.2 では Lighthouse CI と Sentry で十分**、メトリクスは Phase 12 で本番監視構成と一緒に検討する案もアリ（**確認事項**）。

### 5. バンドルサイズ計測

`@next/bundle-analyzer` を導入:

```bash
pnpm --filter @community-platform/web add -D @next/bundle-analyzer
```

`apps/web/next.config.ts`:

```ts
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer(withSentryConfig(nextConfig, ...));
```

```bash
ANALYZE=true pnpm --filter @community-platform/web build
```

→ ブラウザでバンドル可視化が開く。重い依存（hls.js / socket.io-client 等）が分かる。

`docs/performance-baseline.md` 等にベースラインを記録 → 改善後に再測定。

## 実装ステップ

### ステップ1: pino スロークエリログ追加（Phase 11.3 後）

- `nestjs-pino` の `customSuccessMessage` で 1 秒超を `slow request` マーク
- 数日運用してスロー API リスト作成

### ステップ2: Sentry Trace 集中観測期間

- 本番で `SENTRY_TRACE_FULL=true` を 1〜2 週間
- Performance タブで上位スロー API・スロークエリ特定

### ステップ3: Lighthouse CI 導入

- `.github/workflows/lighthouse.yml` 追加
- 主要 5 ページ（ホーム / ログイン / 掲示板 / イベント / 動画一覧）の Score を main マージ時に計測
- ダッシュボード（temporary public storage）でトレンド追跡

### ステップ4: バンドル分析

- `@next/bundle-analyzer` で初回ベースライン記録
- 重い依存特定 → 層4 で改善

### ステップ5: ベースライン文書化

- `docs/performance-baseline.md` に初期計測値（API P95 / バンドルサイズ / Lighthouse Score）を記録
- 改善後の再測定値と比較

## テスト方針

- ステップ1〜2: 本番運用で自然と数値が集まる
- ステップ3: PR で Lighthouse CI が走り、Score 一定以下で警告
- ステップ4: ローカルで `pnpm build:analyze` 実行して目視確認

## 確定事項（2026-04-25）

- ✅ スロークエリ閾値: **1 秒**（pino warn ログ対象）
- ✅ Lighthouse CI: **main / dev マージ時のみ**実行、Performance 80 以上で warn
- ✅ Sentry Trace 集中観測（1.0 サンプリング）は **別フェーズ送り**（本番運用フェーズで実施）
- ✅ `/metrics` エンドポイント（Prometheus）は **Phase 12 送り**
- ✅ バンドルベースラインを `docs/performance-baseline.md` に記録

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/api/src/app.module.ts`（pinoHttp の customSuccessMessage 追加、Phase 11.3 と統合）
- `.github/workflows/lighthouse.yml`（新規）
- `lighthouserc.json`（新規、ルート）
- `apps/web/next.config.ts`（bundle-analyzer 統合）
- `apps/web/package.json`（@next/bundle-analyzer 追加）
- `docs/performance-baseline.md`（初期計測値記録）
- `apps/api/src/app.module.ts`（Prometheus モジュール、任意）
