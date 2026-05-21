---
date: 2026-05-22
scope: feature/venues-fix（dev からの差分 15 ファイル）
branch: feature/venues-fix
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 14
high: 1
medium: 7
low: 6
---

# レビュー結果: feature/venues-fix

> 注意: このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## レビュー対象

`origin/dev...HEAD` で差分のあった 15 ファイル:

- `apps/api/src/i18n/messages/ja/errors.json`
- `apps/api/src/venues/venues.service.ts`
- `apps/api/src/venues/venues.service.spec.ts`
- `apps/api/src/venues/venues.controller.spec.ts`
- `apps/web/app/(dashboard)/venues/page.tsx`
- `apps/web/app/(dashboard)/venues/new/page.tsx`
- `apps/web/app/(dashboard)/venues/[id]/page.tsx`
- `apps/web/app/(dashboard)/venues/[id]/edit/page.tsx`（新規）
- `apps/web/app/(dashboard)/venues/[id]/_components/reservation-dialog.tsx`
- `apps/web/app/(dashboard)/venues/[id]/_components/reservation-section.tsx`
- `apps/web/hooks/venues/use-venues.ts`
- `apps/web/hooks/venues/use-venues.test.ts`（新規）
- `apps/web/test/test-utils.tsx`
- `apps/web/i18n/request.ts`
- `apps/web/messages/ja/venues.json`

## サマリー

- 指摘事項: 14 件（🔴 高 1 / 🟡 中 7 / 🟢 低 6）
- セキュリティ: 2 件 / コード品質: 8 件 / テスト: 4 件

---

## セキュリティ (security-reviewer)

### 🔴 高（0 件）

なし

### 🟡 中（2 件）

- **`apps/api/src/venues/venues.service.ts:262-285` — `createReservation` のレース条件（重複予約の隙間）**
  - 「重複チェック → 作成」が `prisma.$transaction` で囲われておらず、同一スペースに同時刻のリクエストが 2 本来た場合、両方とも `findFirst` で `null` を確認してから両方 `create` してしまう競合状態が起きうる。
  - 修正案: `prisma.$transaction` で `findFirst` と `create` を一括にし、必要なら `Serializable` 分離レベルを指定。さらに DB レイヤで `(spaceId, [startAt, endAt))` の GIST EXCLUDE 制約や Unique を入れると確実。
  - 関連: `.claude/knowledge/security-hardening-stack.md` の「横断: データ整合性 / トランザクション漏れ」

- **`apps/api/src/venues/venues.service.ts:155-178, 180-217` — `description` / `accessInfo` 等のリッチテキストに `sanitizeRichText()` を通していない**
  - 入出力ともプレーンテキスト扱いだが、`whitespace-pre-wrap` で生表示されるため XSS は起きない（`dangerouslySetInnerHTML` を使っていない）。**現状は OK** だが、将来 Markdown / HTML を許可する変更が入った場合に備えて、保存前のサニタイズが必要になる点を仕様としてメモしておくとよい。
  - 修正案（将来用）: HTML 化する場合は `sanitizeRichText()`、Markdown を許可する場合は表示時に DOMPurify を通す。
  - 関連: `.claude/knowledge/security-hardening-stack.md` の「層2: XSS / 入出力サニタイズ」

### 🟢 低（0 件）

なし

### 良い点

- `apps/api/src/venues/venues.service.ts:96-103` — `searchVenuesByPgroonga` で `Prisma.sql` テンプレートと `${publishStatus}::"PublishStatus"` キャストを使ってパラメータ化しており、SQL インジェクションを回避している
- `apps/api/src/venues/venues.controller.ts:46,54,65,74` — 管理者操作系に `@Roles("admin", "owner")` + `RolesGuard` が一貫して適用されている
- `apps/api/src/venues/venues.service.ts:287-296` — `cancelReservation` で `reservation.userId !== userId` の所有権チェックがあり、IDOR を防いでいる
- DTO（`CreateVenueDto` / `CreateSpaceDto`）で `@MaxLength(200)` と `@Min(1)` を適用しており、入力長 DoS と異常値を制限している

---

## コード品質 (code-quality-reviewer)

### 🔴 高（1 件）

- **`apps/web/app/(dashboard)/venues/[id]/_components/reservation-section.tsx:59, 68` — Prisma enum と綴り違い: `"cancelled"` を比較しているが DB 値は `"canceled"`**
  - `apps/api/prisma/schema.prisma:2451-2455` の `enum ReservationStatus { pending, confirmed, canceled }`（US 綴り L 一つ）に対して、フロントは `r.status === "cancelled"`（UK 綴り L 二つ）で比較している。
  - 結果として: (1) キャンセル済み予約に対しても **キャンセルボタンが表示され続ける**、(2) `destructive` の Badge variant が **絶対に発火しない**（必ず `secondary` フォールバック）。
  - なお `venues.json` の `reservationStatus` には `canceled` と `cancelled` の両方が定義されており（114-118 行）「読み手はキー違いに薄々気付いていた」可能性がある。バックエンドが返す `canceled` に一本化するのが正解。
  - 修正案: `reservation-section.tsx` の 2 箇所を `"canceled"` に変更し、`venues.json` の `reservationStatus.cancelled` キーは削除（バック側を変えるならば 1 箇所だが、現状の enum が `canceled` のため fr 側を直すのが筋）。`Reservation.status: string` のままだと再発するので、`packages/shared` 側に `ReservationStatus` の as const オブジェクト + union 型を出して両端で参照するのが望ましい。
  - 関連: `apps/api/prisma/schema.prisma`、`CLAUDE.md` の「実装方針: 既存資産の再利用」

### 🟡 中（5 件）

- **`apps/web/app/(dashboard)/venues/[id]/_components/reservation-section.tsx:72` — エラーハンドリングが mutation の onError グローバルに依存しているが、確認ダイアログが無い**
  - `cancelReservation.mutate(r.id)` をクリック即実行で、ユーザーの誤クリックで予約が消える。
  - 修正案: `window.confirm()` か shadcn `AlertDialog` で「予約を取消しますか?」を挟む。他ドメイン（events / projects 等）の削除導線と揃える。
  - 関連: 既存パターン例 `apps/web/app/(dashboard)/events/`

- **`apps/api/src/venues/venues.controller.ts:55-60` — `update` の DTO 型が `Partial<CreateVenueDto> & { publishStatus?: string }`**
  - `Partial<CreateVenueDto>` には既に `publishStatus?: PublishStatus` が含まれているため、上に `& { publishStatus?: string }` を重ねると `string` に拡張されて enum 検証が弱まる（実質 string 受け入れ）。`UpdateVenueDto` を別途 `class-validator` で定義し、`PartialType(CreateVenueDto)` を使うのが NestJS 流。
  - 修正案: `apps/api/src/venues/dto/update-venue.dto.ts` を新規作成し `PartialType(CreateVenueDto)` を継承。controller の型を差し替える。
  - 関連: `CLAUDE.md` の「バックエンド: バリデーション・DTO」

- **`apps/web/app/(dashboard)/venues/[id]/edit/page.tsx` 全体 / `new/page.tsx` 全体 — フォーム管理が `useState` × 8 で React Hook Form を使っていない**
  - CLAUDE.md の規約「フォーム管理に React Hook Form + `@hookform/resolvers/zod` を使用」に未準拠。`name` 必須・`capacity >= 1` 等のクライアントサイド検証も DOM 属性（`min="1"`、`disabled={!name}`）まかせ。
  - 修正案: `packages/shared/src/validators/` に Zod スキーマを置き、RHF + `zodResolver` に置き換える。既存 `events/` / `projects/` の new ページが参考になる。
  - 関連: `CLAUDE.md` の「フロントエンド: UI・フォーム」

- **`apps/web/app/(dashboard)/venues/[id]/_components/reservation-dialog.tsx:31, 96-104` — `startAt` / `endAt` の `datetime-local` 値をそのまま POST している**
  - `datetime-local` は **タイムゾーン情報なしのローカル文字列**（例: `"2026-06-01T10:00"`）を返す。バック側の DTO は `@IsDateString()` で UTC ISO を期待しているため、ブラウザの TZ がズレている環境（UTC でない海外ユーザー等）でズレが発生する可能性。さらに「開始 < 終了」のチェックがフロントにも存在しない。
  - 修正案: 送信前に `new Date(localValue).toISOString()` で UTC 化し、`endAt > startAt` のバリデーションを追加。可能なら DTO 側に `IsDateAfter("startAt")` 相当（class-validator のカスタム）を導入する。
  - 関連: `apps/api/src/venues/dto/create-reservation.dto.ts:13-17`

- **`apps/web/app/(dashboard)/venues/[id]/page.tsx:95-99` / `apps/web/app/(dashboard)/venues/page.tsx:90-94` — `VENUE_TYPE_LABELS` がハードコード日本語で i18n 化されていない**
  - `venues.json` には `venueType.*` キーが存在するのに、UI 側は `apps/web/lib/constants/venue-types.ts` のハードコード `label`（日本語）を表示している。今回の変更でメッセージは増やしたが活用していない。
  - 修正案: `lib/constants/venue-types.ts` から `label` を消して `value` の列挙だけにし、表示時に `t(\`venueType.${typ}\`)` で引く（`tStatus.has`のように`useTranslations().has()` で fallback も可能）。
  - 関連: `CLAUDE.md` の「実装方針: 既存資産の再利用」

### 🟢 低（2 件）

- **`apps/web/app/(dashboard)/venues/[id]/page.tsx:118-129`、`apps/web/app/(dashboard)/venues/page.tsx:72-82` — `<img>` 直書きで `next/image` を使っていない**
  - 既存コード由来で今回の差分ではないが、`Building2` のフォールバックを足したついでに `<Image>` 化するとパフォーマンス（LCP / CLS）が向上する。
  - 関連: 規約には明記なし、改善余地として

- **`apps/web/app/(dashboard)/venues/[id]/edit/page.tsx:47` — `venue as VenueWithImageFileIds` のキャストが必要なのは、`VenueDetail.images` 型に `fileId` が無いため**
  - `VenueDetail` 型を更新して `images?: Array<{ id; fileId; file: { publicUrl: string | null } }>` を直接含めれば、キャスト不要になる。詳細 API は既に `fileId` を返している（編集ページがそれを使っている）ので、型定義が現実とズレているだけ。
  - 修正案: `apps/web/lib/api/types.ts` の `VenueListItem` / `VenueDetail` の `images` 要素に `fileId: string` を追加。

### 良い点

- `apps/api/src/venues/venues.service.ts:22-70` — 例外ヘルパー関数（`notFoundVenue` 等）を service 上部にまとめ、`BusinessException` + `messageKey` で nestjs-i18n 連携、Phase 11.3 規約に沿っている
- `apps/web/hooks/venues/use-venues.ts:5-7` — 「`onError` は providers の MutationCache.onError に集約しているため hook 内に書かない」というコメント付きで、Phase 11.3 規約を明文化
- `apps/web/i18n/request.ts:25` と `apps/web/test/test-utils.tsx:16,30` — venues 名前空間の追加位置が一貫しており、列挙の追加だけで成立する設計を守っている
- `apps/web/app/(dashboard)/venues/[id]/_components/reservation-section.tsx:64` — `tStatus.has(r.status) ? tStatus(r.status) : r.status` で未知ステータスにも安全にフォールバック
- `apps/api/src/i18n/messages/ja/errors.json:18-21,23-25,38` — venue / space / reservation / reservation_overlap / reservation_cancel の追加位置が既存の構造に揃っている

---

## テスト (test-reviewer)

### 🔴 高（0 件）

なし

### 🟡 中（0 件）

なし

### 🟢 低（4 件）

- **`apps/web/hooks/venues/use-venues.test.ts` — `useUpdateVenue` のテストが欠けている**
  - `useCreateVenue` / `useCreateSpace` / `useDeleteVenue` / `useCreateReservation` / `useCancelReservation` はカバーされているが、`useUpdateVenue` のみテストなし。`onSuccess` で `["venues"]` と `["venues", vars.id]` 両方を invalidate する重要な分岐（編集後のキャッシュ整合性）が無検証。
  - 修正案: `useCreateVenue` と同パターンで 1 ケース追加。

- **`apps/api/src/venues/venues.service.spec.ts:395-407` — `createReservation` の成功ケースで `findFirst` の `where` 条件が検証されていない**
  - 「重複チェックの条件式（startAt: lt, endAt: gt）」が正しいかは予約 SaaS の根幹だが、現状は `findFirst.mockResolvedValue(null)` でスキップされている。境界（startAt == 既存 endAt 等）をテストできていない。
  - 修正案: `findFirst.mock.calls[0][0].where` を取り出して `startAt: { lt: endAt }, endAt: { gt: startAt }` を `expect` する。境界（隣接予約は重複しない）の it も追加。

- **`apps/api/src/venues/venues.controller.spec.ts:65-71` — テストで `req.user.role = "admin"` 固定**
  - `RolesGuard` を override で常に通している（54-57 行）ので role の値自体は使われないが、テストの意図として「権限が無いと 403」のシナリオが欠落している（admin/owner 専用エンドポイントへの非権限アクセスの検証は無し）。E2E でカバーする方針なら OK だが、コメントで明示しておくと将来読みやすい。

- **`apps/web/hooks/venues/use-venues.test.ts:80, 164, 183` — `await new Promise((r) => setTimeout(r, 30))` のような時間依存の sleep**
  - 「fetch されないこと」を sleep で確認している。flaky になる可能性がある。`queryClient.getQueryCache().findAll({ queryKey: ["venues", undefined] })` の状態を直接 assert する、または `expect(apiMock.getOne).not.toHaveBeenCalled()` を `setTimeout` でなく `await Promise.resolve()` 程度の microtask flush で代替する手もある。
  - 関連: 既存の `apps/web/hooks/events/use-events.test.ts` 等の慣習に合わせるなら現状でも一応 OK。

### 良い点

- `apps/api/src/venues/venues.service.spec.ts` — `describe` / `it` がすべて日本語で書かれており、CLAUDE.md テスト規約に完全準拠
- `apps/api/src/venues/venues.service.spec.ts:6-16` の `makeDelegate<T>()` — Proxy で Prisma delegate を自動補完する補助関数を導入しており、新メソッド追加時も `mock` 配列の追記不要で保守性が高い
- `apps/api/src/venues/venues.controller.spec.ts:50-72` — `FeatureEnabledGuard` / `RolesGuard` を `overrideGuard` で bypass しつつ `ValidationPipe` を本番同様に有効化、`req.user` 注入も加えており、controller の責務（DTO 検証 + サービス委譲）を正確に切り出してテストしている
- `apps/web/hooks/venues/use-venues.test.ts:104-114` — 「失敗時 `toast.error` は hook 内では呼ばない（`MutationCache.onError` で一元処理）」を明示的に `expect(toastMock.error).not.toHaveBeenCalled()` で **規約遵守を回帰テスト化** している
- `apps/api/src/venues/venues.service.spec.ts:152, 159` — `findOneVenue` で「null」と「deletedAt あり」の両 NOT_FOUND ルートをそれぞれ独立した `it` で検証

---

## 良い点（全エージェント集約・追記）

- 例外を翻訳キー付き `BusinessException` に統一したことで、フィルタ / i18n / フロント分岐の 4 層連携が venues でも整った
- `useTranslations("venues")` のスコープを feature 単位で切り、ファイル分割を維持できている
- `apps/web/test/test-utils.tsx` の `createHookWrapper` を共用化することで、venues hook テストが薄く保たれている
- `apps/api/src/venues/venues.service.ts` の例外ヘルパー関数化（`notFoundVenue` 等）は albums.service.ts の先行パターンと整合

---

## 関連

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラハン規約: `.claude/knowledge/error-handling-stack.md`
- 前回レビュー: `docs/reviews/2026-05-19-branch-videos-remove-category.md`
- 関連スキーマ: `apps/api/prisma/schema.prisma:2451-2455`（`ReservationStatus` enum）
