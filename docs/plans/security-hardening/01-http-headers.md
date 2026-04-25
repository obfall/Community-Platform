# 01: HTTP セキュリティヘッダー強化（CORS / Helmet / CSP）

## 目的

API 側の HTTP レスポンスヘッダーを本番運用に耐える設定に強化し、Web 側にも適切なセキュリティヘッダーを追加する。

- **CORS**: 許可 origin / methods / headers を厳密に絞る
- **Helmet**: デフォルトに加えて HSTS / X-Frame-Options / Permissions-Policy 等を明示
- **CSP**: Content-Security-Policy を設計・段階導入

## 現状調査

### API 側

```ts
// apps/api/src/main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
});
app.use(helmet());
```

- `methods` / `allowedHeaders` 未指定 → デフォルト全許可
- Helmet はデフォルトのみ（CSP は `helmet()` のデフォルトでは無効）

### Web 側

```ts
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // headers() 設定なし
};
```

- Next.js 側でセキュリティヘッダー設定なし

## 実装ステップ

### ステップ1: API CORS 詳細化

`apps/api/src/main.ts` を改修:

```ts
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? [];
app.enableCors({
  origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Requested-With"],
  exposedHeaders: ["X-Request-Id"], // フロントが requestId を読み取れるように
  maxAge: 86400, // preflight キャッシュ 24h
});
```

`CORS_ORIGIN` 環境変数の書式は **カンマ区切り**（複数オリジン対応、例: `https://example.com,https://staging.example.com`）。

### ステップ2: Helmet カスタム設定

```ts
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: false, // CSP は別途 Web 側で設定（API は CSP 不要）
    hsts: {
      maxAge: 31_536_000, // 1 年
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" }, // X-Frame-Options: DENY
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  }),
);
```

### ステップ3: Web 側のセキュリティヘッダー

`apps/web/next.config.ts` の `headers()` を追加:

```ts
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        // CSP は次のステップで追加
      ],
    },
  ];
},
```

### ステップ4: CSP 設計（report-only モード先行）

CSP のディレクティブを設計。Next.js の固有事情を踏まえて:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io;
  ※ Next.js dev は eval を使用、prod では nonce ベースに切り替え
style-src 'self' 'unsafe-inline';
  ※ Tailwind の inline style がある
img-src 'self' data: blob: https://picsum.photos https://*.r2.cloudflarestorage.com https://*.cloudflarestream.com;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.cloudflarestream.com;
media-src 'self' blob: https://*.cloudflarestream.com;
frame-src 'self' https://*.cloudflarestream.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
report-uri /api/csp-report;  ※ または Sentry CSP ingestion 経由
```

`apps/web/next.config.ts` の `headers()` に追加:

```ts
{
  key: "Content-Security-Policy-Report-Only", // ★まず Report-Only で開始
  value: cspDirectives.replace(/\s+/g, " ").trim(),
},
```

**段階移行**:

1. `Content-Security-Policy-Report-Only` で本番リリース → 1〜2 週間レポート観測
2. レポートを元に必要なドメイン追加 / 違反箇所修正
3. `Content-Security-Policy`（enforce モード）に切替

### ステップ5: CSP report エンドポイント（任意）

CSP 違反レポートを受け取る API エンドポイントを実装するか、Sentry の CSP report ingestion を使う。

**Sentry 利用案（推奨）**:

- Sentry プロジェクト設定で「CSP Report URI」が発行される
- `report-uri https://o<org>.ingest.sentry.io/api/<project>/security/?sentry_key=...`
- 違反が Sentry ダッシュボードで一覧可能

**自前 API 案**:

- `apps/api/src/security/csp-report.controller.ts` を新設
- POST `/api/csp-report` で受け取り → ログに記録（pino で warn レベル）

→ Sentry 利用を推奨。実装ゼロで運用可能。

### ステップ6: dev / staging / production の切替

CSP は環境ごとに緩急を変える:

- **dev**: CSP 設定なし or Report-Only（Next.js HMR が壊れないよう）
- **staging**: Report-Only（本番想定の検証）
- **production**: enforce（最終形）

`next.config.ts` で `process.env.NODE_ENV` 分岐 or `CSP_MODE` 環境変数で制御。

## テスト方針

### 手動テスト

1. デモ環境を立ち上げ、ブラウザ DevTools の Network タブで以下のヘッダーが返ることを確認:
   - `Strict-Transport-Security`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy`
   - `Content-Security-Policy-Report-Only` (or enforce)

2. CORS:
   - 許可外オリジンから fetch → blocked になる
   - 許可オリジンから fetch → 通る

3. CSP report-only:
   - Sentry ダッシュボードでレポートが流れてくることを確認
   - 想定外のドメインが弾かれているなら CSP に追加

### 自動テスト

- `apps/api/test/security-headers.spec.ts` 等で Supertest で各ヘッダーが返ることを検証

## 確定事項（2026-04-25）

- ✅ CSP report は **Sentry CSP ingestion** に送る
- ✅ CSP は **Report-Only → enforce の段階導入**（dev 無効、staging/prod は Report-Only から開始）
- ✅ `CORS_ORIGIN` を **カンマ区切り複数対応** に変更
- ✅ CSP の `unsafe-inline` / `unsafe-eval` は **当面許可**（nonce ベース化は別フェーズ送り）

## 残確認事項

- [ ] WebSocket 用に追加が必要なヘッダーあるか（実装着手時に調査）

## 成果物

- `apps/api/src/main.ts`（CORS 詳細化、Helmet カスタム）
- `apps/web/next.config.ts`（`headers()` + CSP）
- `apps/api/test/security-headers.spec.ts`（任意）
