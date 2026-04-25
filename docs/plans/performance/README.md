# Phase 11.2 パフォーマンス最適化 実装計画

## 目的

リリース前にスロークエリ・冗長な API レスポンス・最適化されていない画像・キャッシュ未活用などの **パフォーマンスボトルネック** を解消し、本番運用に耐える応答性を確保する。

## スコープ

### 対象（5 層）
- **層1**: 計測基盤の整備（処理時間ロギング・メトリクス・Lighthouse CI）
- **層2**: バックエンド DB クエリ最適化（Prisma `select`、N+1 解消、stats を SQL 集計化）
- **層3**: Redis キャッシュ層の導入（頻度の高い一覧 API・マスタデータ）
- **層4**: フロントエンド最適化（バンドル分析、Image 最適化、メモ化）
- **層5**: ネットワーク・データ転送量最適化（HTTP キャッシュ、ページネーション統一、API レスポンス削減）

### 対象外（別フェーズ）
- 大規模アーキテクチャ変更（読み書き分離、CDN 配信、Edge Functions 化）
- DB シャーディング・レプリカ運用
- インフラスケール（Railway → Kubernetes 等）
- マイクロサービス化
- ビデオストリーミング基盤の最適化（Cloudflare Stream に依存、Phase 12 で確認）

## 現状調査サマリ

### 計測・監視
- ✅ Sentry Performance Monitoring 設定済（API 0.2 / Web 1.0、Phase 11.3 で 0.1 に調整予定）
- ❌ pino 等の構造化ログ未導入（Phase 11.3 で導入予定）
- ❌ `/metrics` エンドポイント無し
- ❌ Lighthouse CI 未導入

### バックエンド DB
- ✅ `Promise.all([findMany, count])` で count 二重実行を回避
- ⚠️ `select` 未使用 → 全フィールド転送
- ⚠️ `getParticipantStats` で全参加者をメモリ上で集計（O(n) 処理）
- ⚠️ 一部 service にループ内 DB 呼び出し（質問バリデーション等）

### キャッシュ
- ✅ Redis (BullMQ) 導入済 (ジョブキュー用途)
- ❌ Redis キャッシュ層なし（全て DB 直クエリ）

### フロントエンド
- ❌ バンドル分析未実施（実サイズ不明）
- ❌ `<Image>` / `<img>` 不使用（要改修）
- ❌ `next.config.ts` の `images.remotePatterns` 空（R2 等の画像が最適化されない）
- ❌ `useMemo` / `useCallback` / `React.memo` 使用ゼロ（チャット画面の再レンダリング頻発リスク）

### ネットワーク
- ⚠️ pagination の limit がドメインによって 20 / 50 でバラバラ
- ⚠️ TanStack Query `staleTime` がほぼ未設定（毎回 fetch）
- ❌ HTTP `Cache-Control` ヘッダー未設定

## 層別実装方針

詳細は個別ドキュメントを参照:

- [01-measurement.md](./01-measurement.md) — 計測基盤（pino duration ログ + Sentry Trace 強化 + Lighthouse CI + ヘルス・メトリクス）
- [02-backend-perf.md](./02-backend-perf.md) — Prisma `select` 適用 + N+1 解消 + 集計 SQL 化 + ループ内クエリ削減
- [03-redis-cache.md](./03-redis-cache.md) — Redis キャッシュ層（マスタデータ + 頻度高い一覧 + キャッシュ無効化戦略）
- [04-frontend-perf.md](./04-frontend-perf.md) — バンドル分析 + Image 最適化 + メモ化 + 動的 import
- [05-network-perf.md](./05-network-perf.md) — HTTP キャッシュ + pagination 統一 + API レスポンス削減 + WebSocket 最適化

## 実装順序・見積り

### 推奨順序（依存関係考慮）

1. **層1 計測基盤（最優先）** → ボトルネック特定の前提
2. 層2 バックエンド DB（計測結果に基づく改善）
3. 層3 Redis キャッシュ（DB 改善と並行可）
4. 層4 フロントエンド（独立して並行可）
5. 層5 ネットワーク（仕上げ）

| 順 | 項目 | 工数 |
|---|---|---|
| 1 | 計測基盤 (pino duration + Lighthouse CI + /metrics) | 0.75 日 |
| 2 | バックエンド DB 最適化 (select + N+1 + 集計 SQL 化) | 1 日 |
| 3 | Redis キャッシュ導入 (層 + 主要 API + 無効化戦略) | 1 日 |
| 4 | フロントエンド最適化 (Image + メモ化 + 動的 import) | 0.75 日 |
| 5 | ネットワーク最適化 (キャッシュヘッダ + pagination + select) | 0.5 日 |

**合計 4 日 + QA 0.5〜1 日 = 4.5〜5 日**

## 横断的方針

### 計測駆動の最適化（Measure-Driven）

「推測で最適化しない、計測で判明したボトルネックだけ直す」原則。

1. 層1 で計測基盤を整備（pino duration / Sentry Trace）
2. 1〜2 週間運用してスロークエリ / 重い API を特定
3. ボトルネック上位 3〜5 件を集中的に改善
4. 改善前後で Before/After を Sentry Trace で比較

### Phase 11.3 との関係

層1 で導入する pino / 構造化ログは、**Phase 11.3 (エラーハンドリング) で先行実装予定**。よって層1 は実質「Phase 11.3 の延長で duration 計測を追加」になる。並行 or 11.3 完了後の着手が効率的。

### Phase 11.5 との関係

層4 で導入する Lighthouse CI は、**Phase 11.5 (E2E テスト) で立てた CI ジョブに別ジョブとして追加**する形で整合。

## 確定事項（2026-04-25 ユーザー承認済、Q1〜Q25）

| # | 項目 | 決定 |
|---|---|---|
| Q1 | スコープ（5 層） | このまま OK |
| Q2 | 改善アプローチ | 計測駆動（明らかな問題は即修正、不明は計測で判断） |
| Q3 | スロークエリ閾値 | 1 秒（pino warn ログ対象） |
| Q4 | Sentry Trace 集中観測 | **別フェーズ送り**（本番運用フェーズで実施） |
| Q5 | Lighthouse CI 頻度 | main / dev マージ時のみ（Phase 11.5 と整合） |
| Q6 | Lighthouse Performance 閾値 | 80 以上で warn、マージブロックなし |
| Q7 | `/metrics` エンドポイント | **Phase 12 送り**（本番監視ツール選定後） |
| Q8 | select-presets 集約 | `apps/api/src/common/select-presets.ts` に集約 |
| Q9 | ブロードキャスト並列度 | 10（p-limit、1000 通を 10 秒程度） |
| Q10 | Redis キャッシュ範囲 | マスタ 9 個 + 集計 + 公開上位リスト |
| Q11 | キャッシュ TTL | マスタ 1h / 集計 10m / 上位 5m |
| Q12 | 環境別キャッシュ prefix | `process.env.NODE_ENV` ベースで分離 |
| Q13 | 動的 import 対象 | バンドル分析の結果を見てから決定 |
| Q14 | `<UserAvatar>` 共通化 | 新規作成 + 既存は段階移行 |
| Q15 | メモ化対象 | チャット・通知ベル・大量リストのみ |
| Q16 | React Compiler | **見送り**（stable 後に再検討） |
| Q17 | フォント最適化 | **対応不要**（既に `next/font/google` で対応済み） |
| Q18 | Image priority 範囲 | ヘッダーロゴ + ホームのファーストビューのみ |
| Q19 | Cache-Control 範囲 | 公開系のみ `public`、個人系は何も付けない |
| Q20 | pagination 上限 | 100 件 |
| Q21 | ドメイン別 limit | 一覧 20 / テーブル 50 / 通知 30 / 検索は既存値（Phase 11.1 と整合） |
| Q22 | WebSocket バッチング | **別フェーズ送り**（payload 最小化のみ実施） |
| Q23 | gzip 圧縮 | API 側で `compression` ミドルウェア有効化 |
| Q24 | ETag / Conditional Requests | **Phase 12 送り**（Cloudflare 自動処理に任せる） |
| Q25 | 全体見積り | 4.5〜5 日 |

## 別フェーズ送り項目（Phase 11.2 で対応しない）

| 項目 | 想定フェーズ | 理由 |
|---|---|---|
| Sentry Trace 集中観測（1.0 サンプリング） | 本番運用フェーズ | リリース後の早期に集中採取 |
| `/metrics` エンドポイント（Prometheus 形式） | Phase 12 | 本番監視ツール選定と一緒に |
| WebSocket メッセージバッチング | 未定 | 通知集中時のみ必要、リアルタイム性とトレードオフ |
| ETag / Conditional Requests | Phase 12 | Cloudflare 自動処理に任せる |
| React Compiler 採用 | 未定 | stable 化を待つ |
| 全コンポーネントメモ化 | 未定 | 計測駆動で必要箇所のみ追加 |
| 既存全箇所の `<Image>` 一斉置換 | リリース後 | UserAvatar 共通化 + 段階移行で対応 |
| 大規模アーキテクチャ変更（読み書き分離・シャーディング） | 未定 | スケール課題が出てから |

## 残確認事項

なし（全項目確定）

## 成果物

- `docs/plans/performance/` 配下 6 ファイル（README + 各層詳細）
- Phase 11.2 実装着手時、このフォルダを基点にタスクを分解する
