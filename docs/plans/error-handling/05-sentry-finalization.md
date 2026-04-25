# 05: Sentry 設定の最終確認

## 目的

既に動いている Sentry 連携を本番運用に耐える形に仕上げる:

- **ソースマップアップロード** を CI 化してスタックトレースを読みやすく
- **ユーザーコンテキスト** をログイン時に自動付与
- **PII スクラビング** でパスワード・メール等が Sentry に送られないように
- **Release 紐付け** を git SHA で自動化
- **4xx フィルタ** で想定内エラーのノイズを除外
- **ログレベル↔Sentry レベル** のマッピングを `beforeSend` で統一

## 現状調査

### 実装済み

- `apps/api/src/instrument.ts`: tracesSampleRate 本番 0.2 / dev 1.0
- `apps/api/src/main.ts`: `environment` 設定あり
- `apps/web/sentry.server.config.ts` / `sentry.edge.config.ts`: 両環境で初期化
- `apps/web/instrumentation-client.ts`: Replay 統合（`replaysSessionSampleRate: 0.1` / `replaysOnErrorSampleRate: 1.0`）
- `apps/web/next.config.ts`: `withSentryConfig`（tunnelRoute: `/monitoring`）

### 未実装

- ソースマップアップロードの CI 設定（`.github/workflows/ci.yml` に sentry-cli 呼び出しなし）
- `Sentry.setUser` をログイン時に呼ぶ処理
- `beforeSend` での PII スクラビング
- `beforeSend` での 4xx フィルタリング
- `release` タグに git SHA を自動設定
- ログレベル↔Sentry レベルマッピング（02 と連動）

## 実装ステップ

### ステップ1: Release 紐付け（git SHA）

**API 側** `apps/api/src/instrument.ts`:

```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE ?? process.env.RAILWAY_GIT_COMMIT_SHA,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  // ...
});
```

**Web 側** `apps/web/sentry.*.config.ts` / `instrumentation-client.ts`:

```ts
Sentry.init({
  // ...
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
});
```

Railway / Vercel が自動セットする SHA 環境変数を使うか、CI で明示注入。

### ステップ2: ソースマップアップロードの CI 化

`apps/web/next.config.ts` の `withSentryConfig` は既に設定済みなので、ビルド時に `SENTRY_AUTH_TOKEN` があれば自動アップロードされる（現状既に動作するはず）。

**確認項目**:

- `.github/workflows/ci.yml` のビルドジョブに `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` 環境変数が渡されているか
- 無ければ Secrets に追加 + ワークフローで注入
- ビルド後に Sentry ダッシュボードで「ソースマップ: アップロード済み」を目視確認

**API 側のソースマップ**:
Node.js のスタックトレースは TypeScript → JS のマッピングが必要。NestJS は SWC ビルドで sourceMap を生成するので、`apps/api/src/instrument.ts` に以下を追加:

```ts
import "source-map-support/register";
```

`source-map-support` は既に依存に入っている。

### ステップ3: ユーザーコンテキスト付与

**Web** `apps/web/hooks/auth/use-auth.tsx` のログイン成功処理に:

```tsx
import * as Sentry from "@sentry/nextjs";

// ログイン成功時
Sentry.setUser({ id: user.id, email: user.email, username: user.name });

// ログアウト時
Sentry.setUser(null);
```

ただし `email` はメール本文等と混在すると PII リスクがあるため、`id` のみに絞る判断もアリ（**確認事項**）。

**API** では NestJS ガードで認証された `req.user` 情報から Sentry scope にセット。`nestjs-pino` の requestContext と連携して実装:

```ts
// apps/api/src/common/middleware/sentry-user.middleware.ts
import * as Sentry from "@sentry/nestjs";

export class SentryUserMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.user) {
      Sentry.setUser({ id: req.user.id }); // id のみ
    }
    next();
  }
}
```

### ステップ4: PII スクラビング（beforeSend）

**API** `apps/api/src/instrument.ts`:

```ts
Sentry.init({
  // ...
  beforeSend(event, hint) {
    // リクエスト bodyのパスワード系フィールドを削除
    if (event.request?.data && typeof event.request.data === "object") {
      const data = { ...(event.request.data as Record<string, unknown>) };
      for (const key of Object.keys(data)) {
        if (/password|token|secret|authorization/i.test(key)) {
          data[key] = "[Filtered]";
        }
      }
      event.request.data = data;
    }
    // ヘッダーから認証トークン削除
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});
```

**Web** も同様に各 config（`sentry.server.config.ts`, `instrumentation-client.ts`, `sentry.edge.config.ts`）で `beforeSend` を設定。

pino 側の redact（02 参照）と重複するが、Sentry への送信経路は別なので両方必要。

### ステップ5: 4xx フィルタリング

**API** `apps/api/src/instrument.ts` の `beforeSend` に追加:

```ts
beforeSend(event, hint) {
  // ... PII スクラビング

  // 4xx のうち、以下はノイズなので送信しない
  const exception = hint.originalException;
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    // 401 (認証切れ) は大量に出るので送信しない
    if (status === 401) return null;
    // 403 (権限なし) は運用で把握したい → warning で送信
    if (status === 403) {
      event.level = "warning";
      return event;
    }
    // 422 / 400 (ValidationError) は送信しない
    if (status === 400 || status === 422) return null;
    // 404 はリソース不在 → 送信しない（スパム防止）
    if (status === 404) return null;
  }

  return event;
}
```

**Web** 側の `beforeSend` は API からのエラーをどう扱うかだが、基本的にフロントは 5xx / ネットワークエラーのみ送信するようにする。

### ステップ6: ログレベル↔Sentry レベルマッピング

02 で決めた pino ログレベルとの整合性確認:

| pino    | Sentry    | 送信                        |
| ------- | --------- | --------------------------- |
| `fatal` | `fatal`   | 常時                        |
| `error` | `error`   | 常時                        |
| `warn`  | `warning` | 選別（beforeSend で）       |
| `info`  | —         | 送信しない（Breadcrumb へ） |
| `debug` | —         | 送信しない                  |

pino ログから Sentry breadcrumb を自動生成する統合は Sentry 公式の pino integration が提供予定だが、現状は手動でブリッジする:

```ts
// apps/api/src/common/logging/sentry-breadcrumb.ts
import * as Sentry from "@sentry/nestjs";
import { Logger } from "nestjs-pino";

// 主要なドメインイベントで明示的に breadcrumb を追加
Sentry.addBreadcrumb({
  category: "domain",
  message: "user.login.success",
  level: "info",
  data: { userId },
});
```

まず pino のログはそのまま stdout で運用し、Sentry 側は `captureException` + `setContext` で十分な情報を送る方向で進める（優先度低）。

### ステップ7: サンプリング率の最終決定（確定済）

| 種別             | 本番                               | 開発 |
| ---------------- | ---------------------------------- | ---- |
| Errors           | 100%                               | 100% |
| Traces           | **10%**（`tracesSampleRate: 0.1`） | 100% |
| Replay (Session) | 10%（既存維持）                    | —    |
| Replay (OnError) | 100%（既存維持）                   | —    |

**変更点**: API 側の `tracesSampleRate` を現状 `0.2` から `0.1` に引き下げる。

`apps/api/src/instrument.ts`:

```ts
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
```

Web 側（`sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation-client.ts`）も同様に 0.1 で統一。

### ステップ8: 環境分離の確認

- `environment: "production" | "staging" | "development"` がどの環境変数から来るか確認
- staging を Phase 12 で立てる場合に備えて `NODE_ENV` ベースではなく専用の `SENTRY_ENVIRONMENT` を使う案も（**確認事項**）

## テスト方針

### 手動テスト（開発環境で）

1. わざと `throw new Error("test")` を叩いて Sentry ダッシュボードに届くか確認
2. 401 エラーを発生させて Sentry に送られないことを確認
3. 権限なし (403) で `warning` レベルで記録されることを確認
4. ログインフォームで送信したパスワードが `[Filtered]` になっているか確認
5. ソースマップが適用されて元の .ts ファイルの行番号が表示されるか確認

### 本番前チェックリスト

- [ ] Sentry ダッシュボードでソースマップ「Available」表示
- [ ] Release がコミット SHA と一致
- [ ] User コンテキストで `id` 連携
- [ ] PII が `[Filtered]` で送信されている
- [ ] 4xx 系が送信されていない（またはフィルタが効いている）

## 確定事項

- ✅ `Sentry.setUser` は **id のみ** 送信（email/username は送らない）
- ✅ Traces サンプリング率は **本番 10%** に統一（API は 20% → 10% に引き下げ）

## 残確認事項

- [ ] Sentry → Slack アラートは Phase 12 スコープで良いか
- [ ] staging 環境を立てる時は専用 `SENTRY_ENVIRONMENT` を使うか
- [ ] `beforeSend` で 404 を送信しない方針で OK か（監視観点で送りたいなら逆）

## 成果物

- `apps/api/src/instrument.ts`（beforeSend / release / environment 追加）
- `apps/api/src/common/middleware/sentry-user.middleware.ts`（ユーザーコンテキスト付与）
- `apps/api/src/app.module.ts`（ミドルウェア登録）
- `apps/web/sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation-client.ts`（beforeSend 追加）
- `apps/web/hooks/auth/use-auth.tsx`（`Sentry.setUser` 呼び出し）
- `.github/workflows/ci.yml`（Sentry Auth Token 注入、ビルドが自動でソースマップをアップロードする）
