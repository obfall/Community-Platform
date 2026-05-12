---
date: 2026-05-13
scope: feature/board-tests (origin/dev...HEAD + staged tests)
branch: feature/board-tests
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 18
high: 1
medium: 8
low: 9
---

# レビュー結果: 掲示板リファクタ + テスト追加（feature/board-tests）

> ⚠ このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## サマリー

- 指摘事項: 18 件（🔴 高 1 / 🟡 中 8 / 🟢 低 9）
- セキュリティ: 4 件 / コード品質: 7 件 / テスト: 7 件
- 良い点 10 件

レビュー対象は **dev からの差分 21 ファイル** + **ステージ済み新規テスト 16 ファイル**。
ブランチの中心テーマは「掲示板のリファクタ（i18n / 定数集約 / pgroonga title-only / ピン留め追加 / Like ボタン削除）+ 全面テスト追加」。

---

## セキュリティ (security-reviewer)

### 🔴 高（0 件）

無し。

### 🟡 中（3 件）

- **`apps/api/src/board/core/board-core.service.ts:90-93`** — `delegate(name)` で Prisma クライアントを文字列キーで動的引きしている (`(this.prisma as any)[name]`)。`BoardScopeConfig.categoryDelegate` 等の値が **DTO 由来でないこと** を実装内で必ず保証する必要がある。現状 `BoardScopeConfig` は `GLOBAL_BOARD_SCOPE` 等の static const から渡される設計だが、将来 controller / DTO 経由でスコープを取るような変更が入った場合に **Prototype Pollution / 任意デリゲートアクセス** に直結する。
  - 修正案: 受け入れる delegate 名を allowlist 化（`["boardCategory", "boardTopic", ...]`）し、未知の値は throw する。または `BoardScopeConfig` を `{ category: Delegate, topic: Delegate, ... }` のように **Prisma delegate 参照そのもの** を保持する型に変えて文字列キーをやめる。
  - 関連: 設計上の意図は明記されている（type 安全性を一部犠牲）ので緊急ではないが、外部入力経路を作る変更は要注意。

- **`apps/api/src/board/core/board-core.service.ts:140-149` (createCategory)、`281-296` (createTopic)** — `data: Record<string, unknown>` を組み立てて `delegate.create({ data })` に渡している。現状 DTO 由来のフィールド（`dto.name` 等）を **明示列挙** しているので Mass Assignment は防げているが、新規フィールド追加時に `data[...] = dto[...]` のような **スプレッド化 / ループ化** が誘発されやすい構造。
  - 修正案: `Prisma.XxxCreateInput` などの型を使って Prisma 側のフィールド名を厳密に推論させる、または「DTO の whitelist にないキーは絶対に書かない」コメントを付ける（既に近い対応がされているがコメント明示があると安心）。
  - 関連: `security-hardening-stack.md` 「データ整合性 / 書き込み制御」

- **`apps/api/src/board/board-topics.service.ts:38-42`** — pgroonga 検索の `where` を `Prisma.sql` で組み立てているが、`categoryId` は `query.categoryId ? Prisma.sql\`AND category_id = ${query.categoryId}::uuid\` : Prisma.empty` と直接埋め込み。`Prisma.sql\`...\`` のテンプレートリテラル機構でパラメータ化されている **想定** で書かれているが、`::uuid` キャストが直後にあるため可読性が低い。
  - 修正案: `categoryId` は DTO で `@IsUUID()` 済みなので実害は無いが、将来 search 以外のフィルタ条件を増やす際の **テンプレ展開ミス** の温床になりやすい。`Prisma.sql\`AND category_id = ${query.categoryId}\`::uuid` のようにキャストを内側に入れるか、`Prisma.raw` を一切使わず Prisma クエリビルダで書き直す案を検討。
  - 関連: `security-hardening-stack.md` 「SQL インジェクション」

### 🟢 低（1 件）

- **`apps/web/components/highlighted-text.tsx:39`** — `dangerouslySetInnerHTML={{ __html: sanitized }}` を直接使っているが、`DOMPurify` でホワイトリスト（`span` + `class` のみ）を絞り込んでいるため脆弱性なし。レビュー上の自動検知ツールが警告を出す可能性があるので、コメントで「DOMPurify でサニタイズ済み」を強調するとレビュー時の見落としが減る。
  - 注: 当ブランチで新規追加された箇所ではないが、`topic-list.tsx:100` で新たに `<HighlightedText>` の利用が増えたため再確認した。問題なし。

## 良い点（セキュリティ）

- `apps/api/src/board/core/board-core.service.ts` 全体 — Prisma `update` の `data` を **明示列挙** しており Mass Assignment 対策ができている。
- `apps/web/components/highlighted-text.tsx` — pgroonga ハイライト用に **専用コンポーネント** を切って、ALLOWED_TAGS を `["span"]` のみに絞る最小権限設計。多重防御（バックエンドで pgroonga_highlight_html、フロントで再 DOMPurify）。
- `apps/api/src/board/dto/topic-query.dto.ts` — `search?: string` に `@MaxLength(200)` が付いている（pgroonga クエリの DoS / 入力長攻撃対策）。
- `apps/api/src/board/dto/create-topic.dto.ts` — `title` に `@MaxLength(200)`、`categoryId` に `@IsUUID()` が付いている。
- `apps/web/hooks/auth/use-auth.tsx:39-43` — `Sentry.setUser({ id: user.id })` のみで PII を送らない設計が維持されている（Phase 11.3 規約準拠）。

---

## コード品質 (code-quality-reviewer)

### 🔴 高（0 件）

無し。リファクタは全体的に規約準拠。

### 🟡 中（4 件）

- **`apps/web/hooks/board/use-board.ts` 全体** — 多くの `useMutation` で `onSuccess: () => { ... toast.success(...) }` を **個別に書いている**（カテゴリ / トピック / 投稿 / コメント / ピン留めの作成・更新・削除すべて）。これは Phase 11.3 規約の「個別 onError + toast.error の禁止」の **success 側類型**。規約は厳密には `onError + toast.error` を禁じているが、トースト戦略を統一する意図からは `success` 側も粒度を揃えることが望ましい。
  - 現状の方針: 「グローバル onError でエラーは集約、success は個別に出す」設計なら問題なし。ただし `members` 等の他 feature と粒度が揃っているか確認推奨。
  - 修正案: 規約上問題なければそのまま。トースト戦略を変える場合は `members` / `events` 等と統一する。
  - 関連: `error-handling-stack.md` 「層3: API クライアント統一」

- **`apps/web/components/board/board-view.tsx:107-111`** — ハードコードされたマジックナンバー（`PointerSensor activationConstraint distance: 8`）。`topic-list.tsx:177` でも同じ値が使われており、`BOARD_VALIDATION` などと同じく `constants.ts` に集約する余地がある。
  - 修正案: `constants.ts` に `DND_DRAG_DISTANCE = 8` を追加。
  - 影響範囲は小さく、UI/UX チューニングの一部とも言えるので 🟡。

- **`apps/web/components/board/topic-detail-view.tsx:47-52`、`topic-list.tsx:75-78`、`topic-post-section.tsx:75-78`、`topic-post-comment-section.tsx:79-82` 等** — 削除確認に `if (!confirm(t("confirm.delete..."))) return;` でブラウザ標準 `window.confirm` を使用。shadcn/ui の `AlertDialog` が他 feature では使われているか確認したい（例: members / events 等）。
  - 修正案: shadcn/ui の `AlertDialog` で統一すると UX が一貫する。i18n 文言は既に揃っているので置き換えは限定的。
  - 注: dev 側で既に `confirm` 直書きだった箇所もあるので、新規追加分のみを変えるかプロジェクト方針を確認。

- **`apps/api/src/board/board-topics.service.ts:34-95` (searchByPgroonga)** — `pgroongaSearchAndFetch` の戻りを `boardTopic.findMany` で再フェッチ → like を別途取得 → 整形、という3 段階。後段の `findAllTopics` (`board-core.service.ts:204-255`) と整形ロジック (`formatTopic`) が重複している。`format` ヘルパは core 側にあるので呼び出してもよさそう。
  - 修正案: `searchByPgroonga` の整形を `BoardCoreService.formatTopic` に委譲し、`titleHighlighted` / `snippetHighlighted` のみオーバーレイする。コードの重複が減り、`isLiked` 判定ロジックの仕様変更（例: ブロック・ミュート対応）が片方に漏れる事故を防げる。

### 🟢 低（3 件）

- **`apps/web/components/board/topic-list.tsx:166-172`** — `useTopics(query | undefined, { enabled })` の引数 2 つで「presetTopics があれば fetch しない」パターン。`presetTopics` が渡された時の方が一般的な経路なので、`enabled` をデフォルト挙動から切り替える命名・引数構造を整理すると読みやすい。
  - 例: `useTopics(query, options)` のままで、呼び出し側で `enabled` を渡す既存パターンで問題なし。`presetTopics` の方を `data` 互換に揃えるラッパー hook を検討してもよい。

- **`apps/web/components/board/board-view.tsx:271-329`** — `isAdmin` 分岐で「DnD あり版」と「DnD なし版」をほぼ同じマークアップで二重に書いている。
  - 修正案: 共通部分（`Accordion` の中身）を `<CategoryAccordion>` のような子コンポーネントに抽出するとメンテが楽になる。

- **`apps/api/src/board/core/board-core.service.ts:797-812` (notFound helper)** — `NotFoundKey` enum 風 union と `errors.not_found.${key}` の messageKey 生成が密結合。`packages/shared/src/constants/error-codes.ts` の Phase 11.3 拡張で resource key 体系（`board_topic` 等）を一元管理すると、他 feature でも再利用しやすい。

## 良い点（コード品質）

- `apps/api/src/board/core/board-core.service.ts:1` — `NotFoundException / ForbiddenException` から `BusinessException(ErrorCode.X, ...)` への置換が dev 差分で完了している（Phase 11.3 規約準拠）。messageKey で i18n 化されており、`errors.not_found.board_*` / `errors.forbidden_resource.board_*` が `errors.json` に追加されている。
- `apps/web/components/board/constants.ts` — 数値・関数のみで UI 文字列を持たず、i18n は `messages/ja/board.json` で一元管理する設計が明文化されている。`BOARD_LIMITS.searchOverview = 100` は `MAX_PAGE_SIZE` と整合。
- `apps/web/i18n/request.ts:11` — `board` namespace 追加で、新規 feature の i18n 化フローがそのまま再現されている（`members` パターンの素直な踏襲）。
- `apps/web/hooks/auth/use-auth.tsx:78-85` — `isAdmin` / `canEditAuthor` を `useAuth` 上に集約し、`board` の各コンポーネントから呼ぶ。`canEditAuthor` は `null/undefined` を弾く防御も含む。
- `apps/web/hooks/board/use-board.ts:24-26` — `keyOf(scope, ...parts)` ヘルパでクエリキーを構造化し、scope 切替時の混線を防げる設計。`invalidateQueries` の prefix マッチも安定。
- `apps/api/src/board/board-topics.service.ts` 全体 — 検索（pgroonga）/ 通常一覧の分岐が `findAll` の冒頭で明示され、責務が分離されている。

---

## テスト (test-reviewer)

### 🔴 高（1 件）

- **`apps/web/components/board/` 配下の主要コンポーネント（`board-view.tsx` / `topic-list.tsx` / `topic-detail-view.tsx` / `topic-post-section.tsx` / `topic-post-comment-section.tsx` / `create-topic-dialog.tsx` / `edit-topic-dialog.tsx` / `sortable-category-item.tsx` / `highlighted-text.tsx`）** — テストファイル `.test.tsx` が **1 つも追加されていない**。
  - 当ブランチで `apps/web` に Vitest + jsdom + @testing-library/react が **正式導入** されている（`apps/web/vitest.config.ts` 新規、`apps/web/package.json` に `"test": "vitest run"` 追加、`test/test-utils.tsx` に `renderWithProviders` / `createHookWrapper`）。これ以降は「フロント単体テストフレームワーク未導入のため対象外」という従来ルールは **撤廃** され、`*.test.tsx` の不在は通常の指摘対象になる。
  - 追加されたフロント単体テストは `app/(dashboard)/board/page.test.tsx`、`app/(dashboard)/board/topics/[id]/page.test.tsx`、`hooks/board/use-board.test.ts`、`lib/api/board.test.ts` の **4 ファイルのみ**。本ブランチの中心であるコンポーネント群がほぼ未テスト。
  - 特に **`board-view.tsx`** はカテゴリ作成 / 並び替え / 検索 / Accordion 制御の中核ロジックを持つ。`topic-list.tsx` も DnD reorder の境界条件を持つ。これらは E2E (`apps/web/e2e/tests/board/search.spec.ts` の 1 ケース) ではカバーしきれない。
  - 修正案:
    - 最低限、`board-view.tsx` の「検索結果がある時に Accordion が hit カテゴリだけ展開される」「`activeSearch` クリアで通常表示に戻る」を Vitest で書く（`useTopicSearchCategoryHits` を hook モックして HTML レベルで検証）。
    - `topic-list.tsx` の「`presetTopics` が渡された時は `useTopics` が呼ばれない / 渡されなければ呼ばれる」「DnD reorder で API が呼ばれる」を hook モックでテスト。
    - `highlighted-text.tsx` は単一責務（DOMPurify サニタイズ + dangerouslySetInnerHTML）なので、`<script>` タグ除去 / `class="keyword"` 保持などのケースで spec を追加すると XSS リグレッション検知になる。
  - 関連: CLAUDE.md「テスト規約」、`apps/web/test/test-utils.tsx`

### 🟡 中（1 件）

- **`apps/api/src/board/core/board-core.service.spec.ts`** — `BoardCoreService` の **公開メソッド網羅が片落ち**。検証されているのは `findAllCategories` / `softDeleteCategory` / `findOneTopic` / `softDeleteTopic` / `toggleTopicPin` / `toggleTopicLike` / `createTopicPost` / `createTopicPostComment` のみ。
  - **未検証の公開メソッド**:
    - `createCategory` / `updateCategory` / `reorderCategories`
    - `findAllTopics`（pgroonga 経路は別レイヤだが、通常一覧の skip/take/orderBy `[isPinned desc, sortOrder asc, createdAt desc]` の挙動は本メソッドの責務）
    - `createTopic` / `updateTopic` / `reorderTopics`
    - `findAllTopicPosts` / `updateTopicPost` / `softDeleteTopicPost`（postCount decrement の `$transaction` 検証含む）
    - `findAllTopicPostComments`（parent + child の 2 階層フェッチと like 突合）
    - `updateTopicPostComment` / `softDeleteTopicPostComment`（commentCount decrement）
    - `toggleTopicPostLike` / `toggleTopicPostCommentLike`
  - 当ブランチの dev 差分で `BoardCoreService` の例外パスが `NotFoundException` → `BusinessException(ErrorCode.NOT_FOUND, ...)` に変わっている。**この置換が全分岐で漏れなく行われているか** を担保するためにも、各メソッドの NOT_FOUND / FORBIDDEN 経路を 1 ケースずつでも検証することが望ましい。
  - 修正案: 残りメソッドに対し「成功 1 ケース + 失敗 1 ケース」最低 2 ケースの spec を追加。
  - 関連: 既存 spec `apps/api/src/auth/services/login-attempt.service.spec.ts` の網羅パターンを参照。

### 🟢 低（5 件）

- **`apps/api/src/board/board-*.controller.spec.ts` 全 5 ファイル** — ガードを `overrideGuard(FeatureEnabledGuard).useValue({ canActivate: () => true })` で bypass しているため、**実際の `FeatureEnabledGuard` / `RolesGuard` の挙動はテストされていない**。エンドポイント単位の委譲確認としては妥当だが、Phase 11.4 規約で **「`@UseGuards` 抜け」検知** を spec 側で担保したい場合は、controller decorator の存在 (`Reflect.getMetadata("__guards__", BoardTopicsController)`) を確認する spec を 1 つ足すと「将来 decorator を消した時に CI で気付ける」。
  - これは現プロジェクト全体で同パターンなので新規規約議論が必要。優先度低。

- **`apps/api/src/board/board-topics.controller.spec.ts:110-115`** — `PATCH /board/topics/not-a-uuid` で 400 を確認しているのは良い。他コントローラ spec にも同様の **UUID 不正値テスト** を 1 件入れると `ParseUUIDPipe` の付け忘れを検知できる。

- **`apps/web/hooks/board/use-board.test.ts:115-166`** — `useCreateTopic` / `useDeleteTopic` / `useToggleTopicPin` は成功時のみテストしているが、`useUpdateTopic` / `useReorderTopics` / `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory` / `useToggleTopicLike` / `useCreateTopicPost` 等の **mutations が未テスト**。`useTopic` / `useTopicPosts` / `useTopicPostComments` などの query hook も未検証。
  - 当ブランチで多数の hook が変更（i18n toast 化、queryKey の `boardScopeKey` 化）されているので、最低 1 ケースずつ smoke test を増やすと安心。

- **`apps/web/app/(dashboard)/board/page.test.tsx` / `topics/[id]/page.test.tsx`** — page component をモック化してテストする方針は妥当だが、`BoardView` / `TopicDetailView` をモック化してしまうと **page の責務（i18n の heading 取得・params の受け渡し）以外には何もテストされない**。当ブランチで `BoardView` 本体は大幅変更があるが、ページ単位テストでは検出できない。
  - これは責務分離の意図的な選択なので問題なし。ただし `board-view.tsx` 単体テストが必須（🔴 高で指摘済み）。

- **`apps/web/e2e/tests/board/search.spec.ts`** — 検索 hit / hit ゼロを 1 ケースに「or」条件で詰めている。seed データの内容に依存して挙動が変わるため flaky になりやすい。
  - 修正案: seed 用テスト fixture（明確に hit するキーワード / 確実に hit しないキーワード）を `apps/api/prisma/seed.ts` 等で用意して、2 ケースに分ける。
  - 関連: 既存 E2E は seed 依存設計なので、全体方針に従う。

## 良い点（テスト）

- `apps/api/src/board/core/board-core.service.spec.ts` — `describe` / `it` がすべて **日本語** で記述されており、CLAUDE.md テスト規約準拠。`describe("findOneTopic: トピック詳細", ...)` のような「関数名: 何をテストするか」のパターンが整っている。
- `apps/api/src/board/core/board-core.service.spec.ts:101-110` — 例外を投げる経路で `rejects.toBeInstanceOf(BusinessException)` + `rejects.toMatchObject({ code: ErrorCode.NOT_FOUND })` の **2 段階アサーション** を併用。エラーコード規約（Phase 11.3）への準拠を spec で担保している。
- `apps/web/test/test-utils.tsx` — `renderWithProviders` / `createHookWrapper` で `NextIntlClientProvider` + `QueryClientProvider` + `Suspense` を一括提供し、テスト基盤として整っている（再利用しやすい）。
- `apps/api/src/board/board-topics.controller.spec.ts:110-115` — UUID 不正値で 400 を確認している（`ParseUUIDPipe` の動作確認）。
- `apps/web/hooks/board/use-board.test.ts:87-93` — `enabled: false` で fetch されないことを `setTimeout(50)` 後の `expect(...).not.toHaveBeenCalled()` で検証。query gate の正当性確認。
- `apps/web/e2e/tests/board/search.spec.ts` — 既存の Playwright E2E パターン（`storageState` で member 認証）に従って追加されている。

---

## 関連

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラハン規約: `.claude/knowledge/error-handling-stack.md`
- 前回レビュー: `docs/reviews/2026-05-12-branch-i18n-members.md`
