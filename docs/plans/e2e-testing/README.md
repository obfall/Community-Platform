# Phase 11.5 E2E テスト導入 実装計画

## 目的

リリース前に主要ユーザーフローを自動テストでカバーし、リグレッション検出と本番デプロイの安全性を担保する。

## スコープ

### 対象
- **Playwright** の導入と設定
- 主要 6 フローのテストシナリオ作成
  1. ユーザー登録
  2. ログイン
  3. 掲示板投稿
  4. イベント申込
  5. チャット送信
  6. 動画再生
- 認証ヘルパー（storageState で再ログイン省略）
- デモシード活用したテストデータ戦略
- CI 統合（PR ごとに自動実行）

### 対象外（別フェーズ）
- 全 53 画面のフルカバー（主要 6 フロー以降は段階的に追加）
- ビジュアルリグレッション（スクリーンショット差分検出、別途検討）
- パフォーマンステスト（Lighthouse CI 等、Phase 12 で検討）
- モバイルブラウザ・複数ブラウザ網羅（まずは Chromium のみ）

## 現状調査サマリ

### 整備済み
- `apps/web/app/(auth)/{login,register,forgot-password,reset-password}/`: 認証フロー完備
- `apps/web/app/(dashboard)/{board,events,chat,videos}/`: テスト対象 6 フローのページ全て実装済
- `apps/web/lib/auth.ts`: localStorage + Cookie でトークン管理
- `apps/api/prisma/demo/`: 25 ユーザーほか全ドメインのデモデータシーダー
- `db:reset:demo` スクリプト: 毎回クリーンな状態に初期化可能
- `.github/workflows/ci.yml`: lint / type-check / test の CI 整備

### 未実装
- E2E ライブラリ（Playwright / Cypress 等）
- E2E テストファイル
- E2E 用の CI ジョブ
- ステージング環境

## 実装方針

詳細は個別ドキュメントを参照:

- [01-playwright-setup.md](./01-playwright-setup.md) — Playwright 導入と設定（プロジェクト構成、tsconfig、設定ファイル）
- [02-test-data-strategy.md](./02-test-data-strategy.md) — デモシード活用、リセット戦略、テスト分離
- [03-auth-helpers.md](./03-auth-helpers.md) — storageState による認証ショートカット、ログイン UI テストとの両立
- [04-test-scenarios.md](./04-test-scenarios.md) — 主要 6 フローの具体的シナリオ
- [05-ci-integration.md](./05-ci-integration.md) — GitHub Actions ジョブ追加、並列実行、レポート

## 実装順序・見積り

| 順 | 項目 | 内容 | 見積り |
|---|---|---|---|
| 1 | Playwright セットアップ | パッケージ追加、`playwright.config.ts`、ディレクトリ構成、最初の smoke test | 0.5 日 |
| 2 | テストデータ戦略 | `globalSetup` で `db:reset:demo` 実行、テスト間のデータ分離方針 | 0.5 日 |
| 3 | 認証ヘルパー | sysadmin / owner / member 各ロールの storageState を保存し、テストで再利用 | 0.5 日 |
| 4 | 主要 6 フローのテスト | 6 シナリオ × 平均 30 分 = 3 時間 | 0.5 日 |
| 5 | CI 統合 | GitHub Actions ジョブ追加、artifact（trace / video）保存 | 0.5 日 |

**合計見積り**: **2.5 日**（QA 含めて 3 日）

## 横断的方針

### Playwright を選ぶ理由
- Next.js 15 と相性◎、TypeScript ファーストクラス
- ブラウザコンテキスト分離で並列実行が安全
- trace viewer で失敗時のデバッグが楽（DOM スナップショット + ネットワーク + コンソール）
- WebSocket / fetch / SSE のモック・観測ができる
- 動画再生・複雑なインタラクションも自然に書ける
- マイクロソフト製、開発活発、コミュニティ大

### Cypress と比較しない理由
Cypress は同一オリジン制約があり、認証フロー（外部 IdP / リダイレクト）でつまずきやすい。Playwright は最初からマルチオリジン対応。新規導入なら Playwright 一択。

### テストデータ戦略
- **テストスイート開始前** に `db:reset:demo` で DB をリセット
- テストは **既存のデモユーザー**（`sysadmin@test.com` / `qaz1234` 等）を使ってログイン
- 新規作成テスト（投稿・イベント申込）も既存データに対して追加するだけで、テスト終了後のクリーンアップ不要（次回スイート開始時にリセット）
- 並列実行時は **ユーザー単位で分離**（テスト A は yamada、テスト B は suzuki 使う）

### CI 戦略
- PR ごとに E2E を走らせる（lint / type-check / test の後）
- E2E 失敗時は trace ファイルを GitHub Actions Artifact として保存
- 並列度: ローカル 4 並列 / CI 2 並列（GitHub runner のリソース制約）

## 確定事項（2026-04-25 ユーザー承認済、Q1〜Q21）

| # | 項目 | 決定 |
|---|---|---|
| Q1 | E2E ライブラリ | Playwright |
| Q2 | 対象フロー | 主要 6 フロー（登録/ログイン/掲示板投稿/イベント申込/チャット送信/動画再生） |
| Q3 | テストデータ戦略 | スイート開始時 `db:reset:demo` + テスト間累積、**ローカルは別 DB 推奨**、CI は Postgres コンテナ |
| Q4 | 認証戦略 | storageState ショートカット中心（ログイン UI テストだけ素のまま） |
| Q5 | 事前ログイン方式 | UI 経由（フォーム入力） |
| Q6 | CI 実行頻度 | **main / dev へのマージ時のみ**（PR 中は実行しない） |
| Q7 | 対象ブラウザ | **Chromium + Firefox + WebKit**（マルチブラウザ） |
| Q8 | モバイルビューポート | **含める**（iPhone / Android Chrome 等のエミュレーション） |
| Q9 | テスト配置 | `apps/web/e2e/` 配下 |
| Q10 | Required check | 最初は non-required → 安定後に Required に切替 |
| Q11 | webServer 自動起動 | 使う（ローカル: 既存 dev 再利用、CI: 新規起動） |
| Q12 | storageState ロール | **admin / owner / member の 3 つ**（チャット 2 人テストは必要時に動的ログイン） |
| Q13 | CI の DB | GitHub Actions の Postgres 16 サービスコンテナ |
| Q14 | 動画再生テスト | プレイヤー表示 + 視聴進捗 API 呼び出しまで検証 |
| Q15 | 外部 API モック | **MSW（Mock Service Worker）で完全モック** |
| Q16 | 並列度 | ローカル 4 並列 / CI 2 並列 |
| Q17 | テストユーザー | **E2E 専用ユーザーを別 seeder で追加**（既存デモシードと分離） |
| Q18 | アサーション粒度 | 主要要素表示 + 機能動作の検証（ピクセル比較は別フェーズ） |
| Q19 | Artifact 保管期間 | 7 日 |
| Q20 | トークン期限切れ対策 | スイート全体を 15 分以内に収める |
| Q21 | 全体見積り | 3.5〜4.5 日（QA 含む） |

## 修正後の見積り

| 順 | 項目 | 工数 |
|---|---|---|
| 1 | Playwright セットアップ + マルチブラウザ + モバイル設定 | 0.5 日 |
| 2 | テストデータ戦略（別 DB + E2E 専用ユーザー seeder） | 0.75 日 |
| 3 | 認証ヘルパー（admin/owner/member の storageState） | 0.5 日 |
| 4 | 主要 6 フロー実装（マルチブラウザ動作確認込み） | 0.75 日 |
| 5 | CI 統合（Postgres + マルチブラウザ + モバイル + Artifact） | 0.75 日 |
| 6 | MSW モック実装（外部 API 完全モック） | 0.5〜1 日 |

**合計 3.0〜3.5 日 + QA 0.5〜1 日 = 3.5〜4.5 日**

## 別フェーズ送り項目（Phase 11.5 で対応しない）

| 項目 | 想定フェーズ | 理由 |
|---|---|---|
| ビジュアルリグレッション（スクリーンショット差分） | 未定 | Visual テストツール選定が別途必要 |
| Lighthouse CI（パフォーマンステスト） | Phase 12 | デプロイ構成と一緒に検討 |
| 全 53 画面のフルカバー | リリース後 | 主要 6 フロー以降は段階的に追加 |
| ステージング環境構築 | Phase 12 | 本番デプロイ準備で検討 |
| 全 PR で E2E を走らせる運用 | 安定化後 | 当面は main/dev マージ時のみ |
| Required check 必須化 | 安定化後 | E2E が安定してから切替 |

## 残確認事項

なし（全項目確定）

## 成果物

- `docs/plans/e2e-testing/` 配下 6 ファイル（README + 各層詳細）
- Phase 11.5 実装着手時、このフォルダを基点にタスクを分解する
