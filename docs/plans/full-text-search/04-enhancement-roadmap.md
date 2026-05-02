# Phase 11.1: 検索機能 — 実装内容と拡張ロードマップ

## 概要

このドキュメントは Phase 11.1（pgroonga 全文検索）で実装した内容のサマリと、
今後の拡張・改善メニューをまとめたもの。

実装の詳細は以下を参照:

- [01-pgroonga-setup.md](./01-pgroonga-setup.md) — pgroonga 拡張の有効化
- [02-pgroonga-indexes.md](./02-pgroonga-indexes.md) — 12 ドメインのインデックス設計
- [03-domain-search-impl.md](./03-domain-search-impl.md) — 各ドメインの search 実装

---

## 1. Phase 11.1 で実装した内容

### 1.1 アーキテクチャ全体像

```
[フロント]
  検索バー (各 page.tsx)
  ↓ search クエリ
[API]
  Controller → Service.findAll(query)
   ├─ search なし → findAllStandard (通常一覧)
   └─ search あり → searchByPgroonga (pgroonga 検索)
                      ↓
                    pgroongaSearchAndFetch (共通ヘルパー)
                      ├─ pgroonga &@~ で id 検索 + score + ハイライト
                      └─ Prisma findMany で id 経由詳細取得
[DB]
  pgroonga インデックス (12 ドメイン分 + users 複数テーブル)
```

### 1.2 対応ドメイン (12)

| 既存検索を pgroonga 化 (5)                    | 新規検索追加 (7)                                            |
| --------------------------------------------- | ----------------------------------------------------------- |
| events / products / videos / projects / users | board / surveys / skills / albums / venues / contents / faq |

users は `users` / `user_public_info` / `user_profiles` / `user_affiliations` を UNION 横断検索。

### 1.3 検索対象カラム

| ドメイン        | 検索対象                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| events          | title / description                                                                                          |
| products (shop) | name / description                                                                                           |
| videos          | title / description                                                                                          |
| projects        | name / description                                                                                           |
| users           | name + nickname / introduction / specialty / prefecture / bio / organization_name / title / role_description |
| board           | title / body                                                                                                 |
| surveys         | title / description                                                                                          |
| skills          | title / description                                                                                          |
| albums          | title / description                                                                                          |
| venues          | name / description / address / access_info                                                                   |
| contents        | name / description                                                                                           |
| faq             | title / body                                                                                                 |

### 1.4 主要ファイル

#### バックエンド

- `apps/api/prisma/migrations/20260501013656_enable_pgroonga/` — 拡張有効化
- `apps/api/prisma/migrations/20260501014503_pgroonga_indexes/` — インデックス追加
- `apps/api/prisma/migrations/20260502034500_pgroonga_drop_partial_filter/` — partial 条件解除
- `apps/api/src/common/utils/pgroonga.ts` — 検索ヘルパー（`escapePgroongaQuery`, `pgroongaSearchAndFetch`）
- `apps/api/src/common/utils/visibility.ts` — VISIBILITY 定数（公開範囲フィルタ）
- `apps/api/src/common/utils/pagination.ts` — `extractPagination`, `buildPaginationMeta`
- `apps/api/src/common/utils/author.ts` — `AUTHOR_SELECT`, `formatAuthor`

#### フロント

- `apps/web/components/highlighted-text.tsx` — ハイライト描画用コンポーネント
- `apps/web/app/globals.css` — `.keyword` の黄色背景スタイル
- 各 `app/(dashboard)/<feature>/page.tsx` — 検索バー + ハイライト適用

### 1.5 検索の特性

| 観点       | 仕様                                                          |
| ---------- | ------------------------------------------------------------- |
| 形態素解析 | MeCab + IPAdic（「東京」が「京都」にマッチしない）            |
| ソート     | 関連度スコア降順 (`pgroonga_score`)                           |
| ハイライト | `<span class="keyword">語</span>` を pgroonga 側で生成        |
| 公開範囲   | 検索条件を **通常一覧と一致** させる（下書き / 非公開も含む） |
| 検索範囲   | 各ドメインのページ内のみ（横断検索なし）                      |
| 認可       | 各 endpoint の既存ガードをそのまま適用                        |
| 二重防御   | バックでクエリエスケープ + フロントで DOMPurify 再サニタイズ  |

### 1.6 技術的な落とし穴と対策

#### A. ARRAY 検索の重複

`ARRAY[col1, col2] &@~ '...'` は複数列マッチ時に同じ行を複数回返す仕様。

**対策**: `pgroongaSearchAndFetch` 内で `GROUP BY id` + `MAX(score)` で重複排除、`COUNT(DISTINCT id)` で件数取得。

#### B. partial index による誤プラン選択

partial index `WHERE deleted_at IS NULL` は、`SELECT id ... WHERE deleted_at IS NULL` の通常クエリでも Index Scan として選ばれてしまい、ARRAY エントリ分の重複が漏れた。

**対策**: マイグレーション `20260502034500_pgroonga_drop_partial_filter` で WHERE 句を解除。pgroonga インデックスは `&@~` 演算子使用時のみ使われるようになった。

#### C. 検索と通常一覧の VISIBILITY 不一致

当初「検索時は VISIBILITY 強制」（下書き / 非公開を除外）にしていたが、通常一覧では下書きが表示されるため不整合だった。

**対策**: 検索条件を通常一覧と一致させた（events / shop / videos / projects / surveys / contents / venues の 7 ドメインで `publish_status = 'published'` 等を解除）。

### 1.7 共通化された処理

| ヘルパー                 | 役割                                                     | 使用箇所                                              |
| ------------------------ | -------------------------------------------------------- | ----------------------------------------------------- |
| `extractPagination`      | page/limit/skip 正規化（NaN/負/0 を fallback、上限 100） | 10 ドメイン                                           |
| `buildPaginationMeta`    | meta オブジェクト生成 (totalPages / hasNextPage 等)      | 10 ドメイン                                           |
| `escapePgroongaQuery`    | pgroonga クエリ構文の特殊文字エスケープ                  | 12 ドメイン                                           |
| `pgroongaSearchAndFetch` | 検索 SQL + ID 経由詳細取得                               | 12 ドメイン                                           |
| `AUTHOR_SELECT`          | user 基本情報の Prisma select                            | 7 service                                             |
| `formatAuthor`           | `{id, name, avatarUrl}` への DTO 変換                    | 16 箇所                                               |
| `VISIBILITY`             | 公開範囲フィルタ定数                                     | 5 ドメイン (albums/skills/faq/board/users) で継続使用 |

---

## 2. 拡張・改善メニュー

ROI（実装コスト vs 効果）順にカテゴリ分けしたメニュー。

### 🟢 低コスト・高 ROI（すぐ入れられる）

#### 2.1 検索ワードの正規化

**やること**: `escapePgroongaQuery` の中で `.normalize("NFKC")` + `.toLowerCase()`

**効果**:

- 「TOKYO」「Tokyo」「ｔｏｋｙｏ」「東京」が同じ扱い
- 「カフェ」「ｶﾌｪ」が同じ扱い
- 半角数字・全角数字の混在解消

**実装コスト**: 数行

#### 2.2 検索バーのデバウンス

**やること**: フロントの検索 input に 300ms のデバウンス（`useDebouncedValue`）

**効果**:

- 「勉強会」と打つたびに API が 4 回叩かれるのを 1 回に
- API 負荷削減、UX 改善

**実装コスト**: 共通 hook 1 個 + 12 ドメインに展開

#### 2.3 検索結果 0 件のメッセージ改善

**やること**: 「該当なし」+「検索ワードを変えてみてください」+ ヒント表示

**効果**: ユーザーが詰まらない、何を直せばいいか分かる

**実装コスト**: 各 page.tsx に 1 行ずつ

---

### 🟡 中コスト・中 ROI（要件次第）

#### 2.4 検索条件の URL クエリ反映

**やること**: 検索バーの内容を URL の `?search=...` に反映、ブラウザバック対応

**効果**:

- リンク共有可能
- 戻るボタンで前の検索結果に戻れる
- ブックマーク可能

**実装コスト**: 各 page.tsx に searchParams hook で 10 行程度

#### 2.5 検索履歴 / 最近の検索ワード

**やること**: ローカルストレージに保存、検索バー focus 時に候補表示

**効果**: 同じ検索を繰り返すユーザーの体験向上

**実装コスト**: 共通 hook + UI

#### 2.6 タイポ補正（n-gram フォールバック）

**やること**:

- インデックスを 2 系統作成: 形態素 + n-gram
- 形態素検索で 0 件 → n-gram 検索にフォールバック

**効果**:

- 「勉強回」（誤字）でも「勉強会」がヒット
- ローマ字入力にも部分マッチ

**実装コスト**:

- マイグレーション 1 本（n-gram インデックス追加）
- `pgroongaSearchAndFetch` に fallback ロジック
- 副作用: 誤ヒット率も上がる（精度トレードオフ）

#### 2.7 検索結果のソート切替

**やること**: 「関連度順」「新着順」「人気順」の切替 UI

**効果**: 検索結果の使い勝手向上

**実装コスト**: 中。各 service の searchByPgroonga と通常一覧で sort key を統一

#### 2.8 横断検索（全ドメイン 1 つの検索ボックス）

**やること**: グローバルナビに検索バー追加 → 全 12 ドメインを並列検索

**効果**: 「これどこにあったっけ？」のときに便利

**実装コスト**:

- 新規 endpoint `/search/all?q=...`
- 並列クエリ + ドメイン別グルーピング
- フロントの結果表示 UI（タブ or セクション分け）

#### 2.9 オートコンプリート（suggest）

**やること**: 入力中に「もしかして: 勉強会」「人気の検索: 交流会」を表示

**効果**: 検索体験が大幅に向上

**実装コスト**:

- 既存タイトルから候補を引く API
- Combobox UI（shadcn にコンポーネントあり）

---

### 🔴 高コスト・特定要件向け

#### 2.10 同義語辞書

**やること**:

- pgroonga の synonym 機能で同義語登録
- 「PC ↔ パソコン」「クルマ ↔ 自動車」など

**効果**: 表記ゆれを吸収

**実装コスト**:

- 辞書テーブル設計
- 管理画面で登録・編集 UI
- 運用コスト（辞書メンテ）

#### 2.11 ファセット検索

**やること**: 検索結果に「カテゴリ A: 23 件、カテゴリ B: 5 件」と内訳を出す

**効果**: 大量ヒット時の絞り込み体験向上

**実装コスト**: 中〜大。検索クエリと並行して GROUP BY のクエリを発行

#### 2.12 検索ログ収集と分析

**やること**:

- 検索ワード・ヒット件数・クリック先を DB に記録
- 「よく検索されるワード」「0 件ワード」の集計

**効果**:

- データ整備の方向性が見える
- 同義語辞書の精度向上に活用

**実装コスト**:

- ログテーブル設計
- ミドルウェア or hook で記録
- 集計画面 / クエリ

#### 2.13 AI セマンティック検索（ベクトル検索）

**やること**:

- pgvector 拡張で各レコードを embedding 化
- 「集まれる場所」で「カジュアル交流イベント」「週末ハイキング」がヒット
- キーワード検索 + ベクトル検索のハイブリッド

**効果**: 意味が近いものを探せる

**実装コスト**: 大

- pgvector インストール
- OpenAI 等の embedding API で各レコードベクトル化（バッチ処理）
- 新規データの自動 embedding パイプライン
- 月額の embedding コスト

#### 2.14 Meilisearch / Algolia への移行

**やること**: 検索エンジンを丸ごと差し替え

**効果**:

- タイポ補正が標準機能
- 数十 ms 以内のレスポンス保証
- typo / synonym / faceting / suggest が built-in

**実装コスト**: 大

- 別エンジンの運用 / 課金
- データ同期パイプライン
- pgroonga 経由の API ラッパーは維持できるので、フロントは無修正で済む可能性

---

## 3. ロードマップ

```
[今] pgroonga 形態素検索（基本実装完了）
  ↓ 2.1〜2.3 を即対応（数日）
[Phase 11.1+α] 正規化・デバウンス・0件メッセージ
  ↓ 2.4〜2.5 を必要なら
[Phase 12 候補] URL反映 + 履歴
  ↓ ユーザー数増えたら
[後続] タイポ補正 / 横断検索 / オートコンプリート
  ↓ 検索ワード分析で必要性が見えたら
[後続] 同義語 / ファセット / セマンティック検索
  ↓ 数百万レコード規模になったら
[移行検討] Meilisearch or Elasticsearch
```

### 推奨「次にやるなら」3 つ

1. **正規化（2.1）** — 数行で済むし誰も損しない
2. **URL クエリ反映（2.4）** — UX として一気に「ちゃんとしたサービス」感が出る
3. **デバウンス（2.2）** — サーバ負荷削減も兼ねる

---

## 4. 動作確認チェックリスト

Phase 11.1 完了後の確認項目:

- [ ] 12 ドメインすべての検索バーで検索ヒット時に黄色ハイライト表示される
- [ ] 形態素解析が動く（「勉強会」で「勉強会」だけヒット、「京都」で「東京都」がヒットしない）
- [ ] 検索バーを空にすると通常一覧に戻る
- [ ] 通常一覧で見えるレコードが、検索でも検索ワードに合致すればヒットする（VISIBILITY 一致）
- [ ] DevTools Console で React の key 重複警告が出ない
- [ ] ページネーションが検索結果でも動く

---

## 5. 関連設計判断

### 5.1 なぜ pgroonga か

- 規模: 12 ドメイン × 数百〜数千レコード → pgroonga で十分（Elasticsearch は overkill）
- インフラ: DB 1 台で完結（別エンジン不要）
- 日本語精度: MeCab + IPAdic で実用的
- 同期コスト: DB 更新が即時に検索結果に反映
- コスト: 拡張機能なので追加課金なし
- 将来移行: Meilisearch / Elasticsearch に移行する選択肢は残る

### 5.2 なぜ LIKE ではないか

- 精度: LIKE は文字列マッチで誤ヒット（「京都」検索で「東京都」がヒット）
- 速度: 中間一致 LIKE は B-tree が効かず全件スキャン
- スコア: 関連度スコアが計算できない
- ハイライト: 標準機能で出ない、自前実装が必要
- 12 ドメイン横展開: 自前実装の山になる

### 5.3 タイポ対応の現状

現状は完全マッチの形態素検索のみ。タイポ補正は未対応。
要望が出たら 2.6（n-gram フォールバック）で対応可能。
