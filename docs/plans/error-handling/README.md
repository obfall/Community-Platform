# Phase 11.3 エラーハンドリング・構造化ログ 実装計画

## 目的

リリース準備の一環として、アプリ全体のエラーハンドリング戦略を 4 層（バックエンド例外フィルタ／フロント Error Boundary／API クライアント統一／Sentry 最終確認）で整備する。併せて pino ベースの構造化ログとログレベル戦略を導入して運用時のトラブルシュートを効率化する。

## スコープ

### 対象
- **層1**: NestJS グローバル例外フィルタの強化 + Prisma エラーマッピング + カスタム例外 + pino 構造化ログ + traceId
- **層2**: Next.js Error Boundary の階層整備 + 機能別 error.tsx + エラー報告 UI
- **層3**: API クライアントのエラーハンドリング統一 + TanStack Query グローバル onError + トースト統一 + WebSocket エラー処理
- **層4**: Sentry 設定の最終確認 + ソースマップ CI + ユーザーコンテキスト + PII スクラビング + レベルマッピング

### 対象外（別フェーズ）
- AuditLog テーブルへの重要操作トレース書き出し（運用ログ、後日検討）
- Sentry → Slack アラート連携（Phase 12 デプロイフェーズ）

## 現状調査サマリ

### 実装済み
- `apps/api/src/common/filters/all-exceptions.filter.ts` — 統一レスポンス形式（`statusCode`/`message`/`timestamp`/`path`）の例外フィルタ
- `apps/api/src/app.module.ts` — `SentryGlobalFilter` を `APP_FILTER` として登録
- `apps/api/src/main.ts` — ValidationPipe（`whitelist` / `forbidNonWhitelisted`）
- `apps/api/src/instrument.ts` — Sentry 初期化（tracesSampleRate: 本番 0.2 / dev 1.0）
- `apps/web/app/global-error.tsx` — root 崩壊時の Error Boundary + `Sentry.captureException`
- `apps/web/lib/api/client.ts` — axios インターセプタ + 401 リフレッシュトークン自動リトライ + failedQueue
- `apps/web/sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation-client.ts` — 各環境の Sentry 初期化 + Replay 統合
- `apps/web/next.config.ts` — `withSentryConfig`（tunnelRoute: `/monitoring`）

### 未実装・不十分
- Prisma エラー（`P2002` unique / `P2025` not found 等）の個別マッピング
- `HttpException` 継承のビジネス例外クラス
- Request ID / traceId 付与ミドルウェア
- pino / 構造化ログ（現状は NestJS デフォルトの Logger のみ）
- 機能別 `app/(dashboard)/*/error.tsx`
- Sentry `showReportDialog` 等の報告 UI
- TanStack Query グローバル `queryCache.onError` / `mutationCache.onError`
- トースト通知の統一（現状は各ページで個別に `toast.error()` 呼び出し）
- WebSocket のエラーリカバリ
- Sentry ソースマップアップロード（CI 未設定）
- `Sentry.setUser` の自動付与（ログイン時）
- `beforeSend` での PII スクラビング・4xx フィルタリング

## 層別実装方針

各層の詳細は個別ドキュメントを参照:

- [01-backend-exception-filter.md](./01-backend-exception-filter.md) — 層1: 例外フィルタ強化 + Prisma マッピング + カスタム例外
- [02-backend-structured-logging.md](./02-backend-structured-logging.md) — 層1: pino + ログレベル戦略 + traceId
- [03-frontend-error-boundary.md](./03-frontend-error-boundary.md) — 層2: Error Boundary 階層整備 + 報告 UI
- [04-api-client-unification.md](./04-api-client-unification.md) — 層3: TanStack Query グローバルハンドラ + トースト統一 + WebSocket
- [05-sentry-finalization.md](./05-sentry-finalization.md) — 層4: ソースマップ・ユーザーコンテキスト・PII スクラビング・レベルマッピング

## 実装順序・見積り

依存順序: 層1 → 層2・3 並列 → 層4 仕上げ

| 順 | 項目 | 内容 | 見積り |
|---|---|---|---|
| 1 | 層1 例外フィルタ強化 | 統一レスポンスに `code` 追加、Prisma マッピング、カスタム例外、ValidationError 整形 | 0.5 日 |
| 2 | 層1 pino + traceId | nestjs-pino 導入、ログレベル戦略、requestId ミドルウェア、Sentry breadcrumb 連携 | 0.5 日 |
| 3 | 層2 Error Boundary | 機能別 error.tsx 追加、共通 Error Boundary コンポーネント、報告 UI | 0.5 日 |
| 4 | 層3 API クライアント統一 | TanStack Query グローバル onError、トースト統一、WebSocket エラーリカバリ、ネットワーク/サーバー区別 | 0.5 日 |
| 5 | 層4 Sentry 最終確認 | ソースマップ CI、`Sentry.setUser` 連携、`beforeSend` PII スクラビング、4xx フィルタ、レベルマッピング | 0.5 日 |

**合計見積り**: **2.5 日**（テスト・QA 含めて 3 日程度）

## 先行依存・横断事項

### pino の選定理由（層1 の構造化ログ）
- Node.js エコシステムで最速クラス（NestJS Logger を直接置き換え可能）
- `nestjs-pino` 公式連携で request コンテキスト自動付与
- JSON 出力がデフォルトでログ検索ツール（Loki / Papertrail / Better Stack）と相性良好
- 同期/非同期ロギング切替可能で、Prometheus 等のメトリクス観測と両立できる

### ログレベル方針
| レベル | ユースケース | 例 |
|---|---|---|
| `fatal` | プロセス異常終了クラス | DB 接続切断、Redis 障害、OOM |
| `error` | 5xx レスポンス・未ハンドル例外 | 外部 API 500、予期せぬ例外 |
| `warn` | 4xx の想定外 / 境界条件 | 権限なし、バリデーション失敗（想定多数時） |
| `info` | 想定内のイベント | ログイン成功、4xx 認証失敗、主要な state change |
| `debug` | 開発時の詳細 | 受信ペイロード、SQL 等 |

本番では `info` 以上を出力、開発では `debug` まで。

### Sentry レベル ↔ ログレベルマッピング
| ログレベル | Sentry level | Sentry 送信 |
|---|---|---|
| `fatal` | `fatal` | 必ず送信 |
| `error` | `error` | 必ず送信 |
| `warn` | `warning` | `beforeSend` で判定（外部 API 系は送信、権限エラー類は除外） |
| `info` | — | 原則送信しない（Breadcrumb で記録） |
| `debug` | — | 送信しない |

## 確定事項（2026-04-25 ユーザー承認済）

| # | 項目 | 決定 |
|---|---|---|
| 1 | エラーコード定数の置き場所 | `packages/shared/src/constants/error-codes.ts` に置いて API/フロント共有 |
| 2 | バックエンドロガー | `nestjs-pino` + `pino` を採用 |
| 3 | ログ収集先 | Railway デフォルトで運用開始、必要になったら SaaS（Better Stack 等）に移行 |
| 4 | 既存 `toast.error` の移行戦略 | 段階移行（グローバル onError 先行 + 重複抑止トースト ID で UX 維持） |
| 5 | Sentry ユーザーコンテキスト | `id` のみ送信（email / username は送らない） |
| 6 | Sentry Traces サンプリング率 | 本番 **10%**（現状 20% から引き下げ）/ dev 100% |
| 7 | ドメイン別 error.tsx の配備範囲 | events / board / videos / shop の 4 ドメインに固有配備、他は dashboard 共通でフォールバック |

## 残確認事項

- [ ] 層1〜4 のスコープに過不足ないか
- [ ] ログレベル方針のマッピングで OK か
- [ ] Sentry への 4xx 送信方針（権限エラー・ValidationError は送らない）で OK か
- [ ] トースト通知を sonner で統一する方針で OK か
- [ ] 実装順序（層1 → 2・3 並列 → 4）で OK か
- [ ] 全体見積り 2.5〜3 日で妥当か

## 成果物

- `docs/plans/error-handling/` 配下 6 ファイル（README + 各層詳細）
- Phase 11.3 実装着手時、このフォルダを基点にタスクを分解する
