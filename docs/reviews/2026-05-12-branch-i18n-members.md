---
date: 2026-05-12
scope: feature/i18n-members （origin/dev 差分・全 66 ファイル）
branch: feature/i18n-members
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 18
high: 3
medium: 9
low: 6
---

# レビュー結果: feature/i18n-members ブランチ（origin/dev 差分）

> ⚠ このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## サマリー

- 指摘事項: 18 件（🔴 高 3 / 🟡 中 9 / 🟢 低 6）
- セキュリティ: 5 件 / コード品質: 8 件 / テスト: 5 件
- 対象ファイル: 66 件（バック 14, フロント 52）
- 主な変更内容:
  - メンバー機能・enums の i18n 化（next-intl）
  - 共通 UI 抽出（`PaginationBar` / `SearchInput`）
  - `UserProfile` のデッドフィールド削除（`bio` / `website` / `allowDirectMessages`）+ 関連マイグレーション 5 本
  - `lib/api/profile.ts` / `lib/api/members.ts` への API クライアント分割
  - `hooks/profile/` を 6 ファイルに細分化（interests 含む）
  - 興味分野編集 UI 追加（`/users/interest-categories` + `replaceInterests`）

---

## セキュリティ (security-reviewer)

### 🔴 高（0 件）

該当なし。グローバル `JwtAuthGuard` + `ParseUUIDPipe` + `RolesGuard` + 既存の sanitizer 体系が維持されており、本ブランチ単独で導入されたセキュリティリスクは検出されなかった。

### 🟡 中（4 件）

- **`apps/api/src/users/users.service.ts:283-296`** — `updateProfile` の Mass Assignment 余地
  - 問題: `const profileData = { ...dto } as Record<string, unknown>;` で DTO を丸ごとスプレッドして `upsert` の `update` / `create` に渡している。現在の `UpdateProfileDto` は `phone` / `birthday` / `nameKana` / `gender` / `occupation` / `countryOfOrigin` / `avatarUrl` / `headerImageUrl` のみ宣言されており、`ValidationPipe({ whitelist: true })` で余計なフィールドは弾かれる前提だが、**DTO のフィールドを増やした際に意図せず `user_id` や `member_card_barcode` のような同名カラムを更新できるリスク**が残る（`UserProfile` モデルには `memberCardBarcode @unique` がある）。
  - 修正案: `data: { phone: dto.phone, birthday: ..., ... }` のように明示列挙、もしくは安全フィールドだけを取り出すヘルパーを噛ませる。
  - 関連: `.claude/knowledge/security-hardening-stack.md` の「Mass Assignment」
- **`apps/api/src/users/users.service.ts:298-306`** — `updatePublicInfo` 同様の Mass Assignment 余地
  - 問題: `update: dto, create: { user: { connect: { id: userId } }, ...dto }` で DTO を直接展開。`UpdatePublicInfoDto` のフィールド以外は `whitelist: true` で剥がれる想定だが、profile 側と同じく将来 DTO 追加時の事故を防ぐため明示列挙を推奨。
  - 修正案: 同上。
- **`apps/web/app/(dashboard)/profile/_components/profile-form.tsx:95, 127`** — クライアント側のファイルサイズチェックのみで MIME 厳密判定なし
  - 問題: `file.type.startsWith("image/")` でしか MIME を見ていない。`file.type` はブラウザ依存で偽装可能。実際の magic 判定はサーバ側 `validateFileMagic` で行われるため**最終防御は効いている**が、UI で先に弾く想定なら少なくともホワイトリスト（`image/jpeg|png|webp` 程度）に絞った方が UX もセキュリティ的にもベター。
  - 修正案: `if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))` などに変更。
  - 関連: `.claude/knowledge/security-hardening-stack.md` の「ファイルアップロード」
- **`apps/web/app/(dashboard)/members/[id]/page.tsx:147-152`** — メールアドレス公開ロジックがクライアント側 `user.role === "admin"` 判定のみ
  - 問題: フロントの `user.role` を見て `email` を出し分けているが、メールはサーバから常に返ってきている（`UserDetailDto.email` は `@ApiProperty()` で必須）。クライアント側で隠しているだけなので、**DevTools / Network タブで誰でも閲覧可能**。
  - 修正案: サーバ側で「閲覧者が admin の場合のみ email を返す」ように `findOne` をリファクタする（現状の `users.service.ts:205-281` には呼び出し元の `role` を渡していない）。または「メンバー詳細 API は admin の場合 email を含めて返す」という明示的なポリシーをドキュメント化。
  - 関連: `.claude/knowledge/security-hardening-stack.md` の「認証・認可」「機密情報・ログ」

### 🟢 低（1 件）

- **`apps/api/prisma/migrations/20260511163521_drop_user_profile_bio/migration.sql`** — Prisma 自動生成の drift 復元が必要だったマイグレーションがそのまま残っている
  - 問題: 1 行で `idx_users_pgroonga` を誤って drop する内容になっており、直後の `20260511163600_restore_users_pgroonga_index` で復元している。**本番マージ前に「2 本を 1 本に統合（drop しない）」できると履歴がきれい**。ただし `CLAUDE.md` で「適用済みマイグレーションを後から書き換えない」と明記されているため、**既に dev に適用済みなら統合不可** → 現状の運用通り 2 本残すのが正解。
  - 対応: 履歴のドキュメント化のみ（コメントは既に丁寧に書かれている）。

---

## コード品質 (code-quality-reviewer)

### 🔴 高（2 件）

- **`apps/web/app/(dashboard)/members/page.tsx:44`** — admin ユーザーをクライアント側でフィルタリング
  - 問題: `const members = (data?.data ?? []).filter((m) => m.role !== "admin");`。サーバから admin を含めて取得した後にフロントで filter している。
    1. **ページネーション破綻**: サーバが `limit: 20` で返した中に admin が混在すると、画面表示は 20 件未満になり、`meta.total` と整合しない。
    2. **権限が漏れている可能性**: そもそも admin を一般メンバーには非表示にしたい要件なら、サーバ側 (`UsersService.findAll`) の `where` で `role: { not: "admin" }` を組み込むべき。
  - 修正案: バックエンドの `UsersService.findAll` に「閲覧者の role に応じて admin を除外」ロジックを追加、もしくはクエリパラメータで明示的に指定。
  - 関連: `CLAUDE.md` の「API 設計（ページネーション）」
- **`apps/web/hooks/profile/use-interests.ts:18-22`** および **`use-profile.ts:19-26,33-41`** — 個別 `onError + toast.error` の禁止違反
  - 問題: `useMutation` の `onError: () => toast.error(...)` を新規 hook で書いている。Phase 11.3 規約では `providers.tsx` の `QueryCache.onError` がグローバルでトーストを出すため、**個別 hook での `onError + toast.error` は二重表示の原因**。
  - 修正案: `onError` を削除し、グローバルハンドラに任せる。フィールド別エラー表示が必要な場合は `meta: { silentError: true }` を付けて `extractApiError(error)` で構造化アクセス。
  - 関連: `.claude/knowledge/error-handling-stack.md` の「フロント側エラーハンドリング規約」、`CLAUDE.md` の「エラーハンドリング規約」

### 🟡 中（4 件）

- **`apps/web/hooks/members/use-members.ts:53`** — DM 開始失敗のみ `onError + toast.error`
  - 上記同様。グローバル `QueryCache.onError` に任せる方針。`useStartDm` のみ「DM 専用文言」が欲しいなら `meta: { silentError: true }` + `useMutation` の戻りで分岐表示するほうが規約に沿う。
- **`apps/web/app/(dashboard)/profile/_components/profile-form.tsx:75-118`** — `headerUpload` / `avatarUpload` も `onError + toast.error` を直書き
  - 同上。グローバルハンドラ + 文言が必要なら `meta: { silentError: true }`。
- **`apps/web/app/(dashboard)/profile/_components/public-info-form.tsx`** および **`profile-form.tsx`** — 文言が i18n 化されていない
  - 問題: 本 PR はメンバー機能の i18n 化が目玉だが、**profile 編集フォーム側（プロフィールフォーム・公開情報フォーム）はハードコードの日本語が大量に残っている**（ラベル、placeholder、トースト、SPECIALTY_CATEGORIES、EVENT_ROLE_OPTIONS、OCCUPATION_OPTIONS）。一方で members 表示側は `tOccupation` / `tEventRole` 等で i18n 化されている。
  - 修正案: 「i18n は段階対応で profile は次フェーズ」が方針なら問題なし。本 PR でやらないことをコミットメッセージや README に明記すると後から見直したときに判断できる。
  - 関連: `MEMORY.md` の「i18n は MVP では ja 単独運用」。最小レール導入なのでスコープ外で OK だが、members / enums だけ進めた理由を残す価値あり。
- **`apps/api/src/users/users.service.ts:286-288`** — `dto.birthday` の `new Date()` 変換が `birthday: ""` を `Invalid Date` にする
  - 問題: `if (dto.birthday) { profileData.birthday = new Date(dto.birthday); }`。`""` なら if は通らないが、`UpdateProfileDto.birthday` は `@IsDateString()` で検証済みなのでこの分岐は意味がない。一方、フロントの `profile-form.tsx` は空欄を `undefined` に変換しているので実害は出にくいが、API 直叩きで `birthday: null` を送ると `IsDateString` 失敗で 400 が返り、`new Date(null)` には到達しない。 → 現状は問題ないが、`birthday: null` で「リセット」できる API 仕様にしたい場合は別途検討。
  - 修正案: 仕様を「`birthday: null` でリセット可能」にしたいなら `@IsOptional() @ValidateIf((o) => o.birthday !== null) @IsDateString()` 等が必要。

### 🟢 低（2 件）

- **`apps/web/app/(dashboard)/profile/_components/profile-form.tsx:102-105`** — `handleHeaderRemove` が `await updateMutation.mutateAsync` の後に `invalidateQueries` を手動で呼んでいる
  - 問題: `useUpdateProfile` の `onSuccess` で既に `invalidateQueries` している（`use-profile.ts:20`）。**手動 invalidate は二重実行**になる。
  - 修正案: 重複している `queryClient.invalidateQueries(...)` を削除。
- **`apps/web/app/(dashboard)/members/[id]/page.tsx:231-238`** — `specialty` を `,` で split → さらに `/` で split している
  - 問題: 「IT・テクノロジー/Web開発」のような階層 string を CSV 連結で保存しているため UI 側で 2 段 split が必要。データ構造としてカテゴリ ID 配列にした方が将来検索・絞り込みも素直。**ただし現状は MVP として動いており、改善余地レベル**。
  - 修正案: 中長期で正規化テーブル（`UserSpecialty` 等）に移行する案を memo に残す。

---

## テスト (test-reviewer)

### 🔴 高（1 件）

- **`apps/web/app/(dashboard)/members/page.tsx:44` の admin filter ロジック** — 該当する単体テストがない
  - 問題: 上記コード品質指摘とも重複するが、admin を除外するロジックがフロント側で行われており、**ページネーション総数の不整合が起きる挙動を検証するテストがない**。Vitest + Testing Library が apps/web に既に導入されているため、ページコンポーネントのテストは技術的に書ける。
  - 修正案: バックエンド側で admin を除外する方針に変更した上で、 `users.service.spec.ts` に「viewer.role に応じて admin が含まれない」テストを追加。

### 🟡 中（2 件）

- **`apps/api/src/users/users.service.spec.ts`** — `updateProfile` / `updatePublicInfo` / `replaceAffiliations` / `replaceLanguages` / `updateRole` / `updateStatus` / `forcePasswordReset` / `updateEmail` が**全部未テスト**
  - 問題: spec ファイルは存在するが、テスト済みは `findAll`（4 ケース）・`findInterestCategories`（1 ケース）・`replaceInterests`（2 ケース）のみ。本ブランチで追加された `replaceInterests` は網羅されているが、他の admin 操作 / プロフィール更新系は依然未検証。`updateEmail` は二重トランザクション + メール送信があるため特にカバレッジが欲しい。
  - 修正案: 既存の prismaMock パターンに沿って各 public メソッドに最低 1 ケース追加。最も影響範囲が大きい `updateEmail`（旧トークン無効化 / 同一メール早期 return / 重複検知）を優先。
  - 関連: `CLAUDE.md` の「テスト規約」、`.claude/agents/test-reviewer.md` の「公開メソッドの網羅」
- **`apps/api/src/users/dto/update-interests.dto.ts`** — `@ArrayMaxSize(50)` の境界値テストがない
  - 問題: 50 件超は弾く仕様だが spec で検証されていない。class-validator のメタ情報なので `validate(dto)` で容易にテスト可能。
  - 修正案: e2e でも単体でも、51 件渡したら ValidationPipe が 400 を返す保証を入れる。

### 🟢 低（2 件）

- **`apps/web/components/pagination-bar.tsx`** — i18n 化されたが pagination-bar.test.tsx には next-intl の provider が必要
  - 問題: `pagination-bar.test.tsx:5` で `renderWithProviders` を使っており、test-utils 側で next-intl の Provider をラップしている前提に見える。**`renderWithProviders` が実際に NextIntlClientProvider をラップしているか念のため確認**。していなければ `t("previous")` 等が動かずテストが落ちる。
  - 修正案: `apps/web/test/test-utils.tsx`（存在するなら）を確認。`NextIntlClientProvider` が含まれていれば OK。
- **`apps/web/components/search-input.test.tsx`** — i18n 影響なし（メッセージを使っていない）ため現状 OK
  - 良い点として記載。
- **`apps/web/messages/ja/{common,enums,members}.json`** — メッセージキーの整合性チェック（型 / 漏れ検出）がない
  - 問題: 文言 key を typo すると `tCommon.has(key)` 経由で fallback されてしまい、本番で気づきにくい。
  - 修正案: 将来 `i18n-check` 系の lint ルール導入を memo に残す。

### 良い点（テスト）

- `apps/api/src/users/users.controller.spec.ts` — ルート順序の回帰テストを `interest-categories` 追加と同時に整備している点が素晴らしい。「過去にあった `:id` 先取り問題」を防ぐ意図的なテスト。
- `apps/api/src/users/users.service.spec.ts` — pgroonga 経路の `$queryRaw` 引数を検査して `Prisma.sql.values` の中身まで踏み込んでいる点が良い。`replaceInterests` の「空配列」境界値も拾えている。
- `apps/web/components/search-input.test.tsx` / `pagination-bar.test.tsx` — Vitest + RTL 単体テストが追加され、共通 UI が回帰テスト付きで提供されている。フロント単体テスト導入の良い初手。

---

## 良い点（全エージェント集約）

- `apps/api/src/users/users.controller.ts:73-79` — `interest-categories` を `:id` より前に置く設計判断とそのコメント。ルート順序の事故防止が完璧。
- `apps/api/prisma/migrations/20260511163600_restore_users_pgroonga_index/migration.sql` — drift 発生原因（pgroonga インデックスは schema.prisma に書けない）と復元理由をコメントに残している。マイグレーション運用ナレッジとして秀逸。
- `apps/web/lib/api/profile.ts` と `apps/web/lib/api/members.ts` を「自分自身 (/me)」と「他者・admin 操作」で明確に分割し、責務をコメントで明示している。
- `apps/web/i18n/request.ts` — 「locale を ja 固定で返す」「NAMESPACES 配列に追加するだけで feature を増やせる」という最小レール設計が、`MEMORY.md` の i18n 方針（MVP は ja 単独運用）に沿っており拡張性も担保。
- `apps/api/src/users/users.service.ts:84-108` — pgroonga UNION 検索の `matchedSource` を search 用と count 用で共有し、「片側修正事故を防ぐ」コメントを残している。
- `apps/api/src/users/users.service.ts:441-451` — `updateEmail` で旧メール経由の `refreshToken` を `revokedAt` でセッション無効化。`$transaction` でメール変更とセッション無効化を atomic に処理している。
- 「デッドフィールド削除」を 3 つ独立したマイグレーションに分割し、各々にコメントで「なぜ消すか」を残している（`bio` / `website` / `allowDirectMessages`）。

---

## 関連ナレッジ・規約

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラーハンドリング規約: `.claude/knowledge/error-handling-stack.md`
- テスト規約: `CLAUDE.md` の「テスト規約」セクション
- i18n 運用方針: `MEMORY.md` の「i18n は MVP では ja 単独運用」
- 前回レビュー: `docs/reviews/2026-05-02-branch-phase-11.1-full-text-search.md`

---

> ⚠ このレビューは指摘のみで、コードの自動修正は行っていません。各項目を確認の上、修正するかどうかは自身で判断してください。
