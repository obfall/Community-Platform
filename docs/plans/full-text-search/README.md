# Phase 11.1 全文検索（pgroonga）実装計画

## 目的

各ドメインのページ内検索を pgroonga ベースに強化し、関連度順 + 日本語形態素解析 + ハイライト表示を実現する。新規ドメインには検索バーを追加。

## スコープ

### 対象（12 ドメインのページ内検索）

#### 既存検索ありのドメイン（5）→ pgroonga 化（バックエンド置換）
- イベント (`/events?search=`)
- 商品 (`/products?search=`)
- 動画 (`/videos?search=`)
- プロジェクト (`/projects?search=`)
- ユーザー (`/users?search=`)

#### 新規検索追加するドメイン（7）→ search パラメータ + UI 検索バー新規
- 掲示板 (`/board/topics?search=`)
- アンケート (`/surveys?search=`)
- スキル (`/skills?search=`)
- アルバム (`/albums?search=`)
- 会場 (`/venues?search=`)
- コンテンツ (`/contents?search=`)
- FAQ (`/faq?search=`)

### 対象外

| 項目 | 理由 |
|---|---|
| 横断検索 API（`/api/search`） | スコープから除外（Q2 確定） |
| ヘッダーグローバル検索バー | 〃 |
| 専用結果ページ（`/search`） | 〃 |
| ドメインタブ切替 UI | 〃 |
| リアルタイム補完（autocomplete） | 別フェーズ送り（Q9） |
| 検索履歴の保存 | 〃 |
| サジェスト「もしかして？」 | 〃 |
| ファイル本文（PDF）検索 | 〃 |
| ⌘K コマンドパレット | 〃 |
| 個人データ（メモ・ライブラリ）の検索 | 個人専用情報のため除外 |
| 管理者専用データ（ブロードキャスト等）の検索 | 管理者は管理 UI で対応 |

## 現状調査サマリ

### 実装済み
- 各ドメインで `contains` ベースの個別検索:
  - `/events`、`/products`、`/videos`、`/projects`、`/users`（5 ドメイン）
  - 全て `Prisma findMany` の `contains` + `mode: "insensitive"` パターン
- 公開範囲フィルタ（ドメイン別にバラバラに実装）

### 未実装
- pgroonga 拡張
- 関連度ランキング
- ハイライト
- 日本語形態素解析
- 7 ドメインの検索（掲示板 / アンケート / スキル / アルバム / 会場 / コンテンツ / FAQ）

## 層別実装方針

詳細は個別ドキュメントを参照:

- [01-pgroonga-setup.md](./01-pgroonga-setup.md) — Supabase で pgroonga 有効化、マイグレ、CI Postgres を `groonga/pgroonga:latest-alpine-17` イメージに切替
- [02-pgroonga-indexes.md](./02-pgroonga-indexes.md) — 12 ドメインの対象フィールド + インデックス設計
- [03-domain-search-impl.md](./03-domain-search-impl.md) — 既存 5 ドメインの pgroonga 化 + 新規 7 ドメインの検索追加 + 公開範囲フィルタ統一 + フロント側ハイライト表示

## 確定事項（2026-04-25 ユーザー承認済、Q1〜Q18）

| # | 項目 | 決定 |
|---|---|---|
| Q1 | 検索エンジン | pgroonga 採用 |
| Q2 | 検索対象範囲 | **12 ドメイン全部のページ内検索を pgroonga 化**（横断検索は除外） |
| Q3〜Q4 | URL / 結果表示 | スキップ（横断検索の話だったため） |
| Q5 | デフォルトソート | 検索時は関連度（pgroonga score DESC）、無検索時は新着順 |
| Q6 | ハイライト | タイトル + 本文 snippet 両方ハイライト（pgroonga_highlight_html） |
| Q7 | 公開範囲フィルタ | `apps/api/src/common/utils/visibility.ts` に統一ルール集約 |
| Q8 | CI Postgres イメージ | `groonga/pgroonga:latest-alpine-17` に切替 |
| Q9 | 高度機能（補完・履歴） | Phase 11.1 では実装しない |
| Q10 | 掲示板の検索深さ | トピック（タイトル + 本文）のみ |
| Q11 | ユーザー検索の深さ | name / nickname / bio / introduction / specialty / prefecture / 所属 全対象 |
| Q12 | 検索の認証要否 | 全エンドポイント認証必須 |
| Q13 | レートリミット | 既定値 60 req/min/IP（特別扱いしない） |
| Q14 | 結果ページネーション | 各ドメインの既存件数に合わせる（変更なし） |
| Q15 | 0 件時の表示 | シンプルなメッセージのみ |
| Q16 | API 互換性 | スコア + ハイライト両方 API レスポンスに追加 |
| Q17 | フロントキャッシュ時間 | 60 秒（既存と同じ） |
| Q18 | 全体見積り | 3.5〜4 日 |

## 実装順序・見積り

| 順 | 項目 | 工数 |
|---|---|---|
| 1 | pgroonga セットアップ（Supabase 拡張 + マイグレ + CI イメージ切替） | 0.5 日 |
| 2 | インデックス追加（12 ドメイン × 主要カラム） | 0.5 日 |
| 3 | ドメイン検索リファクタ + 新規追加 + フロントハイライト表示 | 2 日 |
|   | - 既存 5 ドメイン pgroonga 化（events / products / videos / projects / users） | (0.5 日) |
|   | - 新規 7 ドメイン検索追加（board / surveys / skills / albums / venues / contents / faq） | (1 日) |
|   | - フロント側ハイライト表示（SafeHtml 経由） | (0.5 日) |

**合計 3 日 + QA 0.5〜1 日 = 3.5〜4 日**

## 別フェーズ送り項目（Phase 11.1 で対応しない）

| 項目 | 想定フェーズ | 理由 |
|---|---|---|
| 横断検索（全ドメイン同時検索 + 結果ページ） | 未定 | リリース後ニーズが出たら検討 |
| ヘッダーグローバル検索バー | 〃 | 〃 |
| リアルタイム補完（autocomplete） | 未定 | 利用データ見て判断 |
| 検索履歴の保存・サジェスト | 未定 | 〃 |
| 「もしかして」スペル訂正 | 未定 | pgroonga 類義語辞書設定が必要 |
| ファイル本文（PDF/Word）検索 | 未定 | OCR / テキスト抽出が必要 |
| ⌘K コマンドパレット | 未定 | UX 拡張、別フェーズ |
| 個人データ（メモ・ライブラリ）検索 | 必要なら別フェーズ | 個人専用情報 |

## 横断的方針

### pgroonga を選ぶ理由（再掲）
- Supabase で有効化可能 + 日本語形態素解析◎ + 関連度スコア + ハイライト
- 別インフラ不要（Postgres 内部で完結）

### インデックス設計
- 主要カラム + 補助カラムを組み合わせた複合インデックス（`USING pgroonga (ARRAY[...])`）
- 論理削除済みは含めない部分インデックス（`WHERE deleted_at IS NULL`）

### 公開範囲フィルタの統一
全ドメイン共通の「検索可視性ルール」を `apps/api/src/common/utils/visibility.ts` に集約。各 search service で参照。

## 残確認事項

なし（全項目確定）

## 成果物

- `docs/plans/full-text-search/` 配下 4 ファイル（README + 各層詳細 3 つ）
- Phase 11.1 実装着手時、このフォルダを基点にタスクを分解する
