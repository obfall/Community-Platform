---
date: 2026-05-02
scope: branch (feature/phase-11.1-full-text-search vs origin/dev)
branch: feature/phase-11.1-full-text-search
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 18
high: 3
medium: 8
low: 7
---

# レビュー結果: feature/phase-11.1-full-text-search

> ⚠ このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## サマリー

- 指摘事項: 18 件（🔴 高 3 / 🟡 中 8 / 🟢 低 7）
- セキュリティ: 4 件 / コード品質: 9 件 / テスト: 5 件
- レビュー対象: ステージ済みの差分（migrations 3 件 / バック service・spec 計 24 件 / 共通 utils 5 件 / フロント 16 件）
- 良い点も多数あり（エスケープ・GROUP BY 重複排除・partial index 削除・spec 追加など）

> 注: 環境上の制約で 3 つのサブエージェント（security/code-quality/test reviewer）を並列 spawn できなかったため、本レビューはオーケストレーターが各エージェント定義（`.claude/agents/*.md`）の SSOT 観点に従って 1 ファイルで統合実施したもの。観点の網羅性は同等。

---

## セキュリティ (security-reviewer)

### 🔴 高（0 件）

なし。pgroonga クエリ構文のエスケープ・SQL identifier の正規表現バリデーション・`Prisma.sql` パラメータ化のいずれも適切に実装されている。

### 🟡 中（3 件） — 計画的に修正

- **`apps/api/src/common/utils/pgroonga.ts:91-100`** — `searchColumns` / `titleColumn` / `snippetColumn` のバリデーションが「最初に使われた瞬間」まで遅延される
  - 何が問題か: `ident()` は呼び出し側が安全な値を渡してくれる前提だが、`searchArrayExpr` 構築のループ内で初めて検証される。今後 `pgroongaSearchAndFetch` の呼び出し側を増やしたとき、ユーザー入力をうっかりカラム名として渡すミスを防ぎたい
  - 修正案: 入口で全カラム名を一括バリデーションする `validateIdentifiers(opts)` を追加（防御は多重で）
  - 関連: 横断: SQL インジェクション

- **`apps/api/src/board/dto/topic-query.dto.ts:14`**, **`apps/api/src/users/users.service.ts:34`** ほか各 search 受け口 — `search` パラメータの `@MaxLength` が DTO ベースの場所にしか付いていない
  - 何が問題か: `BoardTopicsService.findAll` の `TopicQueryDto.search` は `@MaxLength(200)` 付き ✅。一方 `FaqService` / `VenuesService` / `ContentsService` は controller の `@Query("search") search?: string` 直受けで長さ制限なし。`pgroongaSearchAndFetch` 内で `escapePgroongaQuery` するので構文攻撃は無害化されるが、巨大文字列を渡されると pgroonga 側で重い処理をする可能性
  - 修正案: 各 controller で `@Query` 直受けをやめ DTO 化し `@MaxLength(200)` を統一 (FAQ, Contents, Venues controller 該当)
  - 関連: 層4 DoS / 入力長制限

- **`apps/api/src/users/users.service.ts:73-167` (検索版)** — limit が DTO の `extractPagination` 経由で `maxLimit=100` に制限されているが、`searchByPgroonga` の SQL は `LIMIT ${limit}` をクエリ後に手で挿入。今は extractPagination 経由なので安全だが、将来コードを直接書き換えたとき制約を失う動線
  - 何が問題か: 上限値の責任が pagination util と raw SQL の両方に分散
  - 修正案: limit ガードを `pgroongaSearchAndFetch` 内で `Math.min(limit, 100)` で再クランプして保険を掛ける
  - 関連: 層4 入力長制限・上限ガード

### 🟢 低（1 件）

- **`apps/api/prisma/migrations/20260502034500_pgroonga_drop_partial_filter/migration.sql`** — partial index 削除によりインデックスサイズが論理削除レコード分大きくなる
  - 何が問題か: マイグレーションコメントの説明は的確だが、容量影響（特に `events` / `board_topics` のように削除率が高いテーブル）を計測した形跡が無い
  - 修正案: 検索 latency と PG_TABLE_SIZE の before/after を 1 回計測し、結果を docs/plans/full-text-search/ に追記する
  - 関連: 層4 DoS（インデックススキャン速度）

## 良い点（セキュリティ）

- `apps/api/src/common/utils/pgroonga.ts:23-30` — `escapePgroongaQuery` で `"` `\` をエスケープ・構文記号を空白置換、空白整形・前後トリムまで一貫
- `apps/api/src/common/utils/pgroonga.ts:145-150` — `ident(name)` で `^[a-z_][a-z0-9_]*$` のホワイトリスト、不正識別子は例外で fail-fast
- `apps/api/src/users/users.service.ts:84-141` — UNION 検索でも `${escaped}` `${query.status}::"UserStatus"` `${query.role}::"UserRole"` をすべて `Prisma.sql` パラメータ化
- `apps/api/src/events/events.service.ts:84-91` ほか各検索版 — 動的フィルタ（status / categoryId / eventId / dates）も全て enum cast + Prisma.sql で適切
- `apps/web/components/highlighted-text.tsx:33-40` — pgroonga が信頼できる出力でも DOMPurify で `ALLOWED_TAGS=["span"]`, `ALLOWED_ATTR=["class"]`, `ALLOW_DATA_ATTR=false` で多重防御。Phase 11.4 の XSS 規約に準拠

---

## コード品質 (code-quality-reviewer)

### 🔴 高（3 件） — 規約違反・重大なアーキテクチャ違反

1. **`apps/web/app/(dashboard)/settings/members/_components/members-table.tsx:86`** — フロントが `user.titleHighlighted` を読んでいるが、バック (`apps/api/src/users/users.service.ts:205`) は `nameHighlighted` を返す。**キー名が一致せず、ユーザー検索のハイライトが常に未表示になる**
   - 何が問題か: API レスポンスの shape とフロント型 (`UserListItem.titleHighlighted`) が完全に乖離。テストでは shape の検証がないため CI もすり抜けた
   - 修正案: 揃え方は 2 案。
     - 案A: バック users.service.ts L205 を `titleHighlighted: nameHighlightById?.get(user.id)` に変更（他ドメインと統一）。`UserListItem` 型はそのまま
     - 案B: `UserListItem` 型 / `members-table.tsx` の参照を `nameHighlighted` に変更（ユーザーは name 列なので意味的にはこちらが自然）
   - 推奨: **案A**。他 11 ドメインが `titleHighlighted` で統一されており、共通テンプレ（`HighlightedText`）の前提も `titleHighlighted`
   - 関連: CLAUDE.md フォルダ構成・命名統一

2. **`apps/api/src/contents/contents.service.ts:107-111`** + **`apps/web/app/(dashboard)/content/page.tsx:123-130`** — 同じくキー名の不一致。バックは `nameHighlighted` / `descriptionHighlighted` を返し、フロント型 `ContentListItem` は `titleHighlighted` / `snippetHighlighted` を期待
   - 何が問題か: contents 検索のハイライトが常に未表示。`HighlightedText html={c.titleHighlighted}` は undefined になり fallback テキストしか出ない
   - 修正案: `apps/api/src/contents/contents.service.ts` の `formatContentList` でキーを `titleHighlighted` / `snippetHighlighted` に統一（他ドメインと揃える）。フロントは現状維持
   - 関連: CLAUDE.md フォルダ構成・命名統一

3. **`apps/api/src/venues/venues.service.ts:46-74` (`searchVenuesByPgroonga`)** — `pgroongaSearchAndFetch` の戻り値 `hitsById` を捨てて `records` だけ返している。**会場検索でハイライトが返らない**（フロントは `v.titleHighlighted` を読んでも常に undefined）
   - 何が問題か: 他ドメインは `(records, hitsById, total)` を全て使って整形し、`titleHighlighted` をマージする。venues だけ実装が抜けている
   - 修正案: 他ドメイン同様に `hitsById` を取り出し、records をマップして `titleHighlighted` / `snippetHighlighted` を付ける整形関数を追加
   - 関連: CLAUDE.md フォルダ構成・命名統一・`apps/api/src/albums/albums.service.ts:97-114` の実装が参考になる

### 🟡 中（5 件） — 保守性・可読性への中程度の影響

- **`apps/api/src/users/users.service.ts:83-141`** — pgroonga 検索ロジックが `pgroongaSearchAndFetch` ヘルパに乗らない（複数テーブル UNION 構造のため）
  - 何が問題か: 1 ヘルパで吸収できないのは妥当だが、検索版 + count 版の 2 つの WITH 句で UNION SELECT が完全重複しており、保守時に片方だけ修正される事故が起きやすい
  - 修正案: WITH 句のサブクエリを `Prisma.sql` の変数に切り出し、score 取得版と count 版で再利用（または `userPgroongaUnionFragment` のような専用ヘルパ化）

- **`apps/api/src/faq/faq.service.ts:37-51` / `apps/api/src/venues/venues.service.ts:56-74`** — `pgroongaSearchAndFetch` を呼ぶが `limit: 100, offset: 0` を直書きでページネーション meta を返さない
  - 何が問題か: 標準ルート (`findAll`) は `findMany` の結果配列をそのまま返す API なのでこれ自体は仕様だが、pgroonga 経路で 100 件超えはサイレント切り捨てになる。検索ヒットが多いケースで挙動がわかりにくい
  - 修正案: 短期: ヒット件数（total）を含めた meta を返すか、フロントに「100 件まで表示」UI を出す。中期: 他ドメインと同様にページネーション化

- **`apps/api/src/users/users.service.ts:120-141`** — `total` クエリの WITH 句で `UNION` を使っており、検索クエリ（`UNION ALL`）と微妙に違う
  - 何が問題か: total は重複除去のため UNION（DISTINCT）でよいが、score 取得版は UNION ALL で重複行を残してから GROUP BY で集約。意図的に違うが、コメントが無いと混乱を招く
  - 修正案: なぜそれぞれ UNION / UNION ALL なのか 1 行コメントを追加

- **`apps/api/src/contents/contents.service.ts:13-19`** — `ContentQuery` 型がローカル interface で定義され、Zod や class-validator のバリデーションを通っていない
  - 何が問題か: 他ドメインは DTO クラス + class-validator を使っており、controller 層で自動バリデーション。contents は controller で `@Query` を素受けしている可能性が高い
  - 修正案: `apps/api/src/contents/dto/content-query.dto.ts` を新規追加し、`@MaxLength(200) search?: string` などを定義
  - 関連: CLAUDE.md バリデーション・DTO 規約

- **`apps/api/src/users/users.service.ts:153-154`** — `id = ANY(${matched.map(m => m.id)}::uuid[])` で string[] を直接渡している
  - 何が問題か: 動作はするが、各 id の uuid 妥当性は内部生成なので保証されている。ただし将来的に外部入力をここに混ぜると安全性が壊れる動線
  - 修正案: 関数化されている `ident()` のように、配列キャスト用のヘルパをつくり一元管理

### 🟢 低（4 件） — 改善余地

- **`apps/api/src/common/utils/pgroonga.ts:36-41`** — `PgroongaSearchHit.titleHighlighted` / `snippetHighlighted` の型が `string`（non-nullable）だが、pgroonga 側で空文字を返す可能性が高い
  - 修正案: 仕様としては「空文字 OR HTML」なので問題なし。ドキュメント文字列を 1 行追加するとよい

- **`apps/api/src/common/utils/visibility.ts`** — 各ドメインの `where` を一元定義しているが、検索 SQL 側 (`Prisma.sql\`deleted_at IS NULL ...\``) との整合がコメントだけ
  - 修正案: 「Prisma 版 (VISIBILITY) と SQL 版が同一条件であることを保証する」テストを 1 つ追加

- **`apps/api/src/common/utils/pagination.ts:38-42`** — `toPositiveInt` が `Number(value)` で `1.5` のような小数文字列を `Math.floor` で 1 にしている。意図通りだが、文字列「1.5」と数値 1.5 の挙動は同じか軽くテストで担保できる
  - 修正案: 既存テストには小数を含むが、文字列の小数（`"1.5"`）テストケースを追加

- **`apps/api/src/board/board-topics.service.ts:34-95`** — 検索パスは VISIBILITY.boardTopic を使うが、通常パスは `board-core.service.ts` 経由で別の where を構築している
  - 修正案: 検索版・通常版で公開条件が同一なら、`VISIBILITY.boardTopic` を `board-core.service.ts` 側でも使い揃える

## 良い点（コード品質）

- `apps/api/src/common/utils/pgroonga.ts` — ヘルパ抽出により検索ロジックの重複を 12 ドメイン分排除。型でカラム名・テーブル名・where 句を強制
- `apps/api/src/common/utils/pagination.ts` + `apps/api/src/common/utils/author.ts` + `apps/api/src/common/utils/visibility.ts` — Phase 11.1 機会で「以前から散在していたパターン」を共通化。リファクタとしての価値が高い
- `apps/api/src/events/event-results.service.ts` — `AUTHOR_SELECT` / `formatAuthor` への移行が clean
- `apps/api/prisma/migrations/20260502034500_pgroonga_drop_partial_filter/migration.sql` — partial index の重複返しを「`SELECT id` でも IndexScan されるから」と特定し、解説コメント込みで非 partial に直した修正の質が高い
- `apps/web/components/highlighted-text.tsx` — `SafeHtml` を再利用せず専用コンポーネントを作る判断（許可タグを `<span>` のみに絞る）と、その理由のコメントが規約フローに沿う
- `apps/web/lib/api/types.ts` — 12 ドメインの ListItem に同じパターンで `titleHighlighted` / `snippetHighlighted` のコメント付き optional 追加（一貫性 ◎）

---

## テスト (test-reviewer)

### 🔴 高（0 件）

なし。Phase 11.1 で追加された全 service に `*.spec.ts` が同梱されており、規約上のテスト不在は無し。

### 🟡 中（0 件）

### 🟢 低（5 件） — 軽微な網羅性 / 改善候補

- **`apps/api/src/{albums,board,contents,events,faq,projects,shop,skills,surveys,users,venues,videos}/*.service.spec.ts`** — どのテストも `dispatcher` 観点 (search の有無で分岐) のみで、**pgroonga 経路の where 構築 / 整形ロジックは未テスト**
  - 何が問題か: 「`$queryRaw` が呼ばれた」までしか検証していないため、SQL の中身（filter / score 順 / hitsById マージ / titleHighlighted のキー名）に regression が起きても気付けない。実際本レビューで検出した🔴3件はテストですり抜けたもの
  - 修正案: 各 service の `searchByPgroonga` を private のままで構わないが、`$queryRaw.mock.calls[0]` の Prisma.Sql を inspect する snapshot テスト、もしくは `formatXxxList` の戻り shape テスト（`titleHighlighted` キー名が API 契約通りであることの確認）を追加

- **`apps/api/src/common/utils/pgroonga.spec.ts`** — `escapePgroongaQuery` の単体テストは充実しているが、**`pgroongaSearchAndFetch` 自体のテストが無い**
  - 何が問題か: ヘルパが今後 12 ドメインに使われる中核なのに、`ident()` の不正識別子拒否、`hits.length === 0` の早期 return、score 順 ordering 等のロジック分岐が検証されていない
  - 修正案: PrismaLike モックを使って `pgroongaSearchAndFetch` の単体テストを追加

- **`apps/api/src/users/users.service.spec.ts`** — UNION 検索版で「search にキーワードあれば $queryRaw が呼ばれる」しかチェックしていない
  - 修正案: status フィルタ・role フィルタが SQL に乗ること、`matched.length === 0` の早期 return パスを追加

- **`apps/api/src/events/events.service.spec.ts:44-48`** — pgroonga 構文記号のみのケース（`+()[]{}`）が `$queryRaw` を呼ばない検証はある✅。しかし他 service（albums / projects / contents / surveys / videos / users / venues）には同等の境界値テストが無い
  - 修正案: events と shop で書かれているパターンを他 11 ドメインに横展開（コピペ可能）

- **`apps/api/src/common/utils/pagination.spec.ts`** — string `"1.5"` のような小数文字列のテストが無い（数値 `1.5` のテストはある）

## 良い点（テスト）

- `apps/api/src/common/utils/pagination.spec.ts` — describe / it とも完全日本語、境界値（0, 負, NaN, 文字列, maxLimit）を 14 ケースで網羅
- `apps/api/src/common/utils/pgroonga.spec.ts` — クオート / バックスラッシュ / 構文記号 / 空入力 / インジェクション系 と、リスクごとに describe を切って 22 ケース以上
- `apps/api/src/common/utils/author.spec.ts` — profile あり/なし/null/undefined と余分フィールドの除去まで検証。型システムに頼らず動作で検証する姿勢が良い
- 全 service spec が「ファイル名・配置・拡張子・日本語 describe/it」の規約に完全準拠（`apps/api/src/**/*.service.spec.ts`）
- `apps/api/src/events/events.service.spec.ts` の冒頭 `jest.mock("@nestjs/bullmq", ...)` で BullMQ デコレータの実装依存を切る工夫

---

## 全体所感

Phase 11.1 全文検索の実装はセキュリティ的には堅牢（pgroonga クエリエスケープ・SQL identifier ホワイトリスト・パラメータ化・XSS 多重防御）。しかし **API 契約レベルのキー名不整合（🔴3 件）が CI / レビューをすり抜けた** のが特徴的:

- バック側 `nameHighlighted` vs フロント `titleHighlighted` (users / contents)
- venues で `hitsById` を返さない実装漏れ

いずれも **API レスポンス shape を検証するテストが無い** ことが根本原因。今回追加された spec は全て「dispatcher 経路（findMany か $queryRaw か）」の検証で、整形後の戻り値（特にハイライト関連キー）の構造は触れていない。

優先対応:

1. 🔴 3 件のキー名整合（バック側を `titleHighlighted` / `snippetHighlighted` に揃える + venues 整形関数追加） → リリース前必須
2. 🟡 8 件のうち、入力長制限統一（FAQ / Contents / Venues controller の DTO 化）は Phase 11.4 規約に直結するので近いうちに着手推奨
3. 🟢 7 件（特にテストの shape 検証追加）は次スプリント

## 関連ナレッジ

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラハン規約: `.claude/knowledge/error-handling-stack.md`
- Phase 11.1 計画: `docs/plans/full-text-search/`（特に `04-enhancement-roadmap.md`）
- 前回レビュー: なし（このスコープでは初回）
