---
date: 2026-05-18
scope: dev からの差分（feature/albums-i18n-and-tests）
branch: feature/albums-i18n-and-tests
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 15
high: 3
medium: 7
low: 5
---

# レビュー結果: feature/albums-i18n-and-tests（dev からの差分）

> ⚠ このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## 対象ファイル（16 件）

- `apps/api/src/albums/albums.controller.ts`
- `apps/api/src/albums/albums.controller.spec.ts`（新規）
- `apps/api/src/albums/albums.service.ts`
- `apps/api/src/albums/albums.service.spec.ts`
- `apps/api/src/i18n/messages/ja/errors.json`
- `apps/web/app/(dashboard)/albums/[id]/edit/page.tsx`
- `apps/web/app/(dashboard)/albums/[id]/page.tsx`
- `apps/web/app/(dashboard)/albums/new/page.tsx`
- `apps/web/app/(dashboard)/albums/page.tsx`
- `apps/web/e2e/tests/albums/album-create.spec.ts`（新規）
- `apps/web/hooks/albums/use-albums.test.ts`（新規）
- `apps/web/hooks/albums/use-albums.ts`
- `apps/web/i18n/request.ts`
- `apps/web/lib/api/albums.test.ts`（新規）
- `apps/web/messages/ja/albums.json`（新規）
- `apps/web/test/test-utils.tsx`

## サマリー

- 指摘事項: 15 件（🔴 高 3 / 🟡 中 7 / 🟢 低 5）
- 内訳: セキュリティ 5 / コード品質 7 / テスト 3
- 良い点: 11 件

---

## セキュリティ (security-reviewer)

### 🔴 高（2 件） — リリース前必須対応

- **`apps/api/src/albums/albums.service.ts:260-296`** — `addPhotos` に **所有権チェックが無い**
  - 何が問題か: 認証済みであれば、`POST /albums/:id/photos` で **他人のアルバムに写真を追加できる**（IDOR / 権限昇格）。`update` / `remove` は `currentUser.role !== "admin/owner" && album.createdByUserId !== currentUser.id` で弾いているのに、`addPhotos` だけ素通り。
  - 修正案: `addPhotos(albumId, currentUser, photos)` のシグネチャに変えて `update` と同じ判定 (`forbidden("album_update")` 相当) を入れる。controller も `@CurrentUser()` を渡すよう変更する。
  - 関連: `.claude/knowledge/security-hardening-stack.md` 「横断: 認証・認可」（「自分のリソースしか操作できない」要件）

- **`apps/api/src/albums/albums.service.ts:298-307` / `apps/api/src/albums/albums.controller.ts:96-104`** — `removePhoto` にも **所有権チェックが無い**
  - 何が問題か: 他人のアルバムの写真を任意に削除できる（破壊的操作の IDOR）。controller は `albumId` と `photoId` を受け取るだけで `@CurrentUser()` も読んでいない。
  - 修正案: controller で `@CurrentUser()` を受け、service に渡す。service で `album.createdByUserId !== currentUser.id`（admin/owner は除外）の場合 `forbidden("album_delete")` 相当を投げる。
  - 関連: 同上

### 🟡 中（2 件）

- **`apps/api/src/albums/albums.controller.ts:62 / 86-94`** — `addPhotos` / `create` の `Body` に DTO + ValidationPipe が適用されていない経路がある
  - `addPhotos` は `@Body() body: { photos: Array<{ fileId: string; title?: string; caption?: string }> }` というインライン型のため、`photos` の **配列長上限 / fileId が UUID か / title・caption の MaxLength** が検証されない（DoS / 不正値混入）。`@MaxLength()` / `@ArrayMaxSize()` / `@IsUUID()` が効かない。
  - 修正案: `AddPhotosDto`（`@ValidateNested()` + 子 `PhotoEntryDto` に `@IsUUID()` `@MaxLength(200)` 等）を切って差し替える。
  - 関連: `.claude/knowledge/security-hardening-stack.md` 「層4 入力長制限（DoS 対策）」

- **`apps/api/src/albums/albums.controller.ts:47`** — `createCategory` で `@Body("name") name: string` を直接受けている（バリデーション無し）
  - 何が問題か: 文字列長無制限、空文字許容、type 偽装（`name: 123`）の余地。Roles ガードで管理者限定ではあるが、DTO + class-validator で `@IsString()` `@MaxLength(50)` 等を入れるのが規約。
  - 修正案: `CreateAlbumCategoryDto`（`@IsString()` `@MinLength(1)` `@MaxLength(50)`）を作って `@Body() dto: CreateAlbumCategoryDto` で受ける。

### 🟢 低（1 件）

- **`apps/api/src/albums/albums.controller.ts:66-74`** — `update` の `Body` 型もインライン（`{ title?: string; description?: string; publishStatus?: string }`）
  - 何が問題か: `categoryId` をフロント (`apps/web/app/(dashboard)/albums/[id]/edit/page.tsx:64-66`) は送っているが API 側型には無く、ValidationPipe の `whitelist: true` の挙動次第で落ちる。`publishStatus` も string 受けで enum 検証されていない。
  - 修正案: `UpdateAlbumDto`（`@IsOptional()` + 個別 `@IsString()/@IsUUID()/@IsEnum(PublishStatus)`）を新設し、controller / service の引数型を統一する。これでフロント側の `categoryId` ズレも検知できる。

---

## コード品質 (code-quality-reviewer)

### 🔴 高（1 件） — 規約違反

- **`apps/web/hooks/albums/use-albums.ts:26-121`** — `Phase 11.3 エラハン規約` 違反: 各 mutation で **`onError: () => toast.error(...)` を新規で書いている**
  - 何が問題か: `apps/web/app/providers.tsx:21-32` の `QueryCache.onError` / `MutationCache.onError` がグローバルに `handleApiError` を実行する。各 hook で `onError` を書くと **トーストが二重表示** される可能性がある（fixed id を付けているので実害は緩和されているが、規約上は禁止）。新規ドメイン (`albums`) で同じパターンを増殖させると技術的負債が広がる。
  - CLAUDE.md 規約: 「エラーハンドリング規約 — フロント: API エラーのトーストはグローバル `QueryCache.onError` 任せ、個別 `onError + toast.error` を書かない」
  - 修正案 (A): `onError` 行を全削除し、グローバル `handleApiError` の汎用文言 (`server` / `notFound` / `conflict` 等) で済ませる。
  - 修正案 (B): mutation 固有のドメインメッセージを残したい場合は `mutationFn` 直後で `.catch(...)` ではなく、**meta: `{ silentError: true }`** を付けてグローバルを抑止 → 自前で `extractApiError` でコードを見て出す（既存 `apps/web/hooks/board/use-board.ts` などの実装パターンに合わせる）。
  - 関連: `.claude/knowledge/error-handling-stack.md`

### 🟡 中（3 件）

- **`apps/api/src/albums/albums.controller.ts:31-105`** — Swagger デコレータ規約の **`@ApiResponse()` が全エンドポイントに無い**
  - 何が問題か: `@ApiOperation` は付いているが、ステータス別 (`200/201/204/400/403/404`) の `@ApiResponse({ status, description })` が無いため、Swagger UI で正常系・異常系のレスポンス仕様が共有できない。
  - 修正案: 最低限 200/201/204 と 403/404（権限・存在）を `@ApiOkResponse` / `@ApiCreatedResponse` / `@ApiNoContentResponse` / `@ApiNotFoundResponse` / `@ApiForbiddenResponse` で記述する。

- **`apps/web/lib/api/albums.ts:8 / 17`** — `getOne` / `update` の戻り型が `unknown` 相当（明示型なし）
  - 何が問題か: 呼び出し側 (`apps/web/app/(dashboard)/albums/[id]/page.tsx:39` `const album = data as AlbumDetail | undefined;`) で `as` キャストを強いられている。`AlbumDetail` は page と edit/page で **二重定義** されている (`[id]/page.tsx:17-32`, `[id]/edit/page.tsx:26-32`)。
  - 修正案: `lib/api/types.ts` 等に `AlbumDetail` 型を 1 箇所だけ定義し、`getOne` / `update` の戻り型に明示する。page 側の `as` キャストは不要になる。

- **`apps/api/src/albums/albums.controller.ts:60-64`** — `create` だけ `@CurrentUser("id") userId: string` で受け、他は `@CurrentUser() currentUser: { id; role }` を受けている（**一貫性なし**）
  - 何が問題か: 同じファイル内で 2 種類の `@CurrentUser` の受け方が混在しているため、将来 `create` に「公開ステータス admin 限定」のような role 判定を追加するとき型を直すコストが発生する。
  - 修正案: 統一して `@CurrentUser() currentUser: { id; role }` で受ける（service 側の `create` シグネチャも `(currentUser, dto)` に揃える）。

### 🟢 低（3 件）

- **`apps/web/app/(dashboard)/albums/[id]/page.tsx:17-32 / [id]/edit/page.tsx:26-32`** — `AlbumDetail` の型が 2 ファイルに重複している
  - 修正案: 共通型として `app/(dashboard)/albums/_types.ts` か `lib/api/types.ts` に切り出して両方から import。

- **`apps/web/app/(dashboard)/albums/[id]/page.tsx:51-53`** — 三項型キャストが過剰
  - `const statusLabel = t(``status.${album.publishStatus}` as `status.${"draft" | "published" | "unpublished"}` );`
  - `album.publishStatus: string` をそのまま使っているため、`as` キャストでごまかしている。
  - 修正案: `AlbumDetail.publishStatus` の型を `"draft" | "published" | "unpublished"` に絞れば `as` 不要。

- **`apps/api/src/albums/albums.service.ts:324`** — `createCategory` の slug 生成が `album-${Date.now()}`
  - 何が問題か: 並行リクエストで衝突する可能性、人間が見ても category 名と無関係（運用時に追跡しづらい）。
  - 修正案: name から slug を生成（`slugify(name)` + uniqueness 衝突時にサフィックス）が望ましいが、現状運用が回るならそのままで可（低優先）。

---

## テスト (test-reviewer)

### 🟡 中（2 件）

- **`apps/api/src/albums/albums.service.spec.ts`** — `addPhotos` / `removePhoto` の **権限テストが無い**（実装側に権限チェックが無いことの裏返し）
  - 何が問題か: 上記セキュリティ指摘（IDOR）が修正された場合、現行 spec はカバーしていないので将来のリグレッションを検知できない。
  - 修正案: セキュリティ指摘修正後に「他人の `addPhotos` / `removePhoto` は FORBIDDEN を投げる」「admin / owner は他人のアルバムにも追加・削除できる」のケースを追加する。

- **`apps/api/src/albums/albums.controller.spec.ts:56-58`** — Guard を全て override で bypass している
  - 何が問題か: コメントには「FeatureEnabled / Roles の挙動は別レベルでテスト」とあるが、`createCategory` の `@UseGuards(RolesGuard) @Roles("admin", "owner")` が実際に効くかどうかは **このファイル内では検証できない**。一般メンバーが `POST /albums/categories` を叩いた場合に 403 になるテストが欲しい（現状は admin 固定で 201 のみ）。
  - 修正案: 既存テストはそのまま残し、別 describe で `RolesGuard` を override せず、`reflector` を mock した上で role=member の 403 を確認するケースを追加する。または E2E 側でカバーする。

### 🟢 低（1 件）

- **`apps/web/e2e/tests/albums/album-create.spec.ts`** — 編集・削除・写真追加のフロー spec が無い
  - 何が問題か: 「アルバム作成」「空表示」の 2 ケースしか無く、上記セキュリティ修正後の「自分以外編集不可」「写真追加→削除」の主要フローが E2E で守られていない。
  - 修正案: `album-edit.spec.ts` / `album-photo.spec.ts` 等を追加（既存パターン: `apps/web/e2e/tests/board/` を参考）。優先度は低（既存ドメインの主要フロー spec は段階的に拡充している運用と推察）。

---

## 良い点（全エージェント集約）

- **セキュリティ**
  - `apps/api/src/albums/albums.service.ts:71-76, 102-138` — `findAll` / `findOne` で **可視性条件（published or 作成者 or admin/owner）** が一貫し、draft の他人取得時も「FORBIDDEN ではなく NOT_FOUND」で存在を漏らさない（情報漏洩対策のベストプラクティス）。
  - `apps/api/src/albums/albums.service.ts:114, 117` — pgroonga 検索の動的 WHERE で `Prisma.sql` + parameterized (`${...}::uuid` `${...}::"PublishStatus"`) を使っており SQL インジェクションが防げている。
  - `apps/api/src/albums/albums.controller.ts:55, 70, 81, 89, 100-101` — 全 ID パラメータで `ParseUUIDPipe` を適用しており UUID 偽装攻撃を防げる。
  - `apps/api/src/albums/dto/create-album.dto.ts` / `album-query.dto.ts` — `@MaxLength(200)` / `@IsUUID()` / `@IsEnum(PublishStatus)` を入れており入力検証が堅い。
  - `apps/web/app/(dashboard)/albums/new/page.tsx:120-126` — `FileUploadList` 共通コンポーネント経由で `fileCategory="image"` `maxSizeMB={10}` を渡しており、ファイルアップロード規約（カテゴリ別 MIME ホワイトリスト）に沿っている。

- **コード品質**
  - `apps/web/i18n/request.ts:11-21` — `NAMESPACES` 配列に `albums` を追加するだけで feature i18n 化が完結する設計が踏襲されており、CLAUDE.md「i18n は MVP では ja 単独運用」方針通り。
  - `apps/web/messages/ja/albums.json` — `list / new / edit / detail / status / toast / categoryDialog` で適切に分割され、`{count}` `{createdBy}` プレースホルダで動的値も i18n 化されている。
  - `apps/api/src/i18n/messages/ja/errors.json:13-14, 27-28` — `not_found.album` / `forbidden_resource.album_update|delete` が他ドメインと同じ階層構造で追加されており、ErrorCode + i18n key の規約に沿っている。
  - `apps/api/src/albums/albums.service.ts:311-330` — カテゴリ取得が `cache.getOrSet` + `prefix:scope:key` 形式、create 後の `cache.invalidate(prefix)` も実装されており Phase 11.2 パフォーマンス規約に準拠。

- **テスト**
  - `apps/api/src/albums/albums.service.spec.ts` — describe / it が **完全に日本語**、構造化グルーピング (`findAll: 経路分岐` / `findAll: 可視性` 等) が読みやすい。CLAUDE.md テスト規約に完全準拠。
  - `apps/api/src/albums/albums.service.spec.ts:127-209` — `findOne` で **published / draft 作成者本人 / draft admin / draft 他人 (NOT_FOUND) / unpublished 他人 (NOT_FOUND) / 物理存在しない / 論理削除済み** を全て網羅しており、可視性条件のテストとして優秀。
  - `apps/api/src/albums/albums.controller.spec.ts` — supertest による HTTP レベルテスト（status code 検証含む）と、`ParseUUIDPipe` の 400 確認ケース (`162-166`) もあり、controller の責務を適切にカバー。
  - `apps/web/hooks/albums/use-albums.test.ts` — 各 mutation について「成功時の invalidate + toast.success」「失敗時の固定 id 付き toast.error」を**全 8 hook 分**揃えており抜けが無い。

## 関連

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラハン規約: `.claude/knowledge/error-handling-stack.md`
- パフォーマンス規約: `.claude/knowledge/performance-stack.md`
- CLAUDE.md（フォルダ構成・テスト規約・i18n 方針）
- 前回類似レビュー: `docs/reviews/2026-05-12-branch-i18n-members.md`, `docs/reviews/2026-05-13-branch-board-tests.md`

> ⚠ このレビューは指摘のみで、コードの自動修正は行っていません。各項目を確認の上、修正するかどうかは自身で判断してください。
