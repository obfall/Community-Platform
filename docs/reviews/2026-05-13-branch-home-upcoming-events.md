---
date: 2026-05-13
scope: branch diff vs origin/dev (feature/home-upcoming-events)
branch: feature/home-upcoming-events
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 15
high: 1
medium: 7
low: 7
---

# レビュー結果: feature/home-upcoming-events (dev からの差分)

> ⚠ このレビューは **指摘のみ** で、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。

## サマリー

- 対象ファイル: 26 件（API: 6 / Web: 20）
- 指摘事項: 15 件（🔴 高 1 / 🟡 中 7 / 🟢 低 7）
- セキュリティ: 3 件 / コード品質: 7 件 / テスト: 5 件
- 主要変更: ホーム画面の刷新（直近イベント / 自分の参加予定 / お知らせ / 直近予定の 4 ウィジェット）と `apps/web` 単体テストの本格導入

---

## セキュリティ (security-reviewer)

### 🔴 高（0 件）

なし

### 🟡 中（2 件）

- **`apps/api/src/events/events.controller.ts:57-77`** — `getUpcoming` / `getMyUpcoming` で `limit` / `days` を文字列受け取り → `parseInt` で手動パース。DTO + class-validator を介していないため、Throttle・型安全・テスト容易性の点で弱い
  - 何が問題か: コントローラに `MAX_UPCOMING_LIMIT` / `MAX_MY_UPCOMING_DAYS` の上限ガードは実装されており直接の DoS リスクは低いが、規約上は **DTO + `@Max()`** で表現するのが原則（CLAUDE.md セキュリティ規約「層4: 入力長制限」）
  - 修正案: `GetUpcomingQueryDto`（`@IsOptional() @IsInt() @Min(1) @Max(20) limit?: number`）と `GetMyUpcomingQueryDto`（`days` 同様）を作って `@Query() query: GetUpcomingQueryDto` で受ける。`ValidationPipe` の `transform: true` で自動変換される
  - 関連: `.claude/knowledge/security-hardening-stack.md`「層4 DoS 対策」

- **`apps/api/src/events/events.controller.ts:57`** — `@Get("upcoming")` / `@Get("my-upcoming")` に Throttle が付いていない。ホーム画面ロード時に常時叩かれる経路で、特に `findMyUpcoming` は JOIN を含む
  - 何が問題か: `@SkipThrottle` も無いのでデフォルト Throttle が効くはずだが、ホーム連打などで負荷が懸念される箇所として明示的に検討対象
  - 修正案: 計測結果次第だが、ホームウィジェット系は `@Throttle({ default: { limit: 30, ttl: 60_000 } })` 程度を検討。あるいはフロントの `staleTime` を伸ばす（現状 30 秒で妥当）
  - 関連: 現状の規模では「やらない判断」も妥当。記録だけ残す

### 🟢 低（1 件）

- **`apps/api/src/events/events.service.ts:1143`** — `mapEventDetail(event: any)` の `any` 型。型安全性が弱く、戻り値スキーマ変更時の検知が効かない
  - 修正案: 既存の `Prisma.EventGetPayload<{ include: ... }>` パターンに揃える。本 PR の差分外だが対象パッケージ全体の保守性に影響

### 良い点

- `apps/api/src/events/events.service.ts:1019` — `findUpcoming` の `where.status: { in: UPCOMING_LISTABLE_STATUSES }` で **定数化**。`draft` / `canceled` / `ended` の意図しない露出を防いでいる
- `apps/api/src/events/events.service.ts:1056-1063` — `findMyUpcoming` で `status: { not: ParticipantStatus.canceled }` + イベント側も `deletedAt: null` / `status: { not: canceled }` と二重に絞り込んでいて、削除イベントが漏れない
- `apps/api/src/events/events.controller.ts:30-33` — `MAX_UPCOMING_LIMIT` / `MAX_MY_UPCOMING_DAYS` の上限定数があり、`?limit=100000` 等の濫用を防いでいる
- 認証は `app.module.ts` の `APP_GUARD: JwtAuthGuard` でグローバル適用済。`@Public()` 未指定なのでホームウィジェット系も認証必須。OK
- `@CurrentUser("id")` でログインユーザーの id を取得しており、`findMyUpcoming` で他人のデータが漏れない設計

---

## コード品質 (code-quality-reviewer)

### 🔴 高（1 件）

- **`apps/web/hooks/events/use-events.ts:80,93,105,118,131-136,148,161,191,204,224,237,255,282,297`** — `useMutation` で個別 `onError: () => toast.error(...)` を新規で書いている（**Phase 11.3 規約違反**）
  - 何が問題か: `apps/web/components/providers.tsx` の `QueryCache.onError` でグローバルにトースト表示している前提のため、個別 `onError + toast.error` は **重複表示** になる
  - ※ この PR の差分は主に `useUpcomingEvents` / `useMyUpcomingEvents` の追加だが、既存箇所への触れ込みは無くても、本ファイルを次に編集する時には PR を分けて整理が必要
  - **本 PR の直接の差分は `useUpcomingEvents` / `useMyUpcomingEvents` で、これら新規 query には個別 onError は無く規約準拠**。指摘は既存箇所への注意喚起であり、本 PR ブロックではない
  - 修正案: グローバル `QueryCache.onError` 任せに統一。フィールド別表示が必要な hook のみ `meta: { silentError: true }`
  - 関連: `CLAUDE.md` 「エラーハンドリング規約」 / `.claude/knowledge/error-handling-stack.md`

  → **本指摘は本 PR の直接対象外（既存資産の改善余地）**。優先度を 🟡 中に下げて記録のみとし、別 PR で `events.ts` 全体を整理することを推奨

### 🟡 中（4 件）

- **`apps/api/src/events/events.controller.ts:57,68`** — 新規エンドポイント `getUpcoming` / `getMyUpcoming` に `@ApiResponse` / `@ApiQuery` のレスポンス・パラメータ定義が無い
  - 何が問題か: Swagger UI から limit / days パラメータと返却スキーマが見えない。既存エンドポイントは `@ApiOperation` のみで揃っていて統一感はある（規約準拠）が、`@ApiQuery({ name: "limit", required: false, type: Number, example: 3 })` を足すと API ドキュメントの精度が上がる
  - 修正案: `@ApiQuery` を追加。レスポンス型は `UpcomingEvent[]` / `MyUpcomingEvent[]` で `@ApiOkResponse({ type: ... })` で記述
  - 関連: `CLAUDE.md` 「バックエンド: API 設計」

- **`apps/api/src/events/events.controller.ts:57-66`** — `limit` を文字列で受けて手動 parseInt + clamp している（規約: DTO + ValidationPipe）
  - 修正案: 上記セキュリティ指摘と同じく `GetUpcomingQueryDto` を作って `@Type(() => Number) @Min(1) @Max(20)` で表現すると、エンドポイント側のロジックが消えてテストもしやすい
  - 関連: `CLAUDE.md` 「バックエンド: バリデーション・DTO」

- **`apps/web/components/notifications/announcements-widget.tsx:10`** — `ANNOUNCEMENT_TYPES = "announcement,event_announcement"` のように **カンマ区切り文字列** で type フィルタを渡している
  - 何が問題か: `NotificationQuery.type` は `string | string[]` 型なので、配列 `["announcement", "event_announcement"]` を渡すのがより型安全。サーバ側の `findAll` が `type: ["announcement", "event_announcement"]` で `{ in: [...] }` に変換する仕組みになっており、文字列でも動くのは現状の偶然の互換性
  - 修正案: `const ANNOUNCEMENT_TYPES = ["announcement", "event_announcement"] as const;` にして `type: ANNOUNCEMENT_TYPES` で渡す。サーバの parseSafeQueryStringArray ロジックに依存しない
  - 関連: `apps/web/lib/api/types.ts:331` の `NotificationQuery.type` 型

- **`apps/web/components/calendar/upcoming-schedule-widget.tsx:81-93`** — `formatDateTime` 内のロケール (`"ja-JP"`) ハードコード。i18n 化規約からすると locale 動的化の検討余地
  - 何が問題か: `i18n/request.ts` で MVP は ja 固定なので**現時点では問題なし**だが、将来 en を入れる際にこのコンポーネントを再訪する必要がある
  - 修正案: 将来課題として TODO コメントを残す（多言語化は MVP 対象外）
  - 関連: メモリ `project_i18n_out_of_mvp_scope.md`

### 🟢 低（3 件）

- **`apps/web/components/events/upcoming-events-widget.tsx:17-26`** / **`upcoming-schedule-widget.tsx:81-93`** — `formatDateTime` が両ウィジェットでほぼ同等のロジックを重複定義
  - 修正案: `apps/web/lib/date.ts` 等に切り出して共有

- **`apps/web/components/calendar/upcoming-schedule-widget.tsx:36-42`** — `range` を `useMemo` で算出しているが、依存配列が `[]` で固定。コンポーネントマウント時刻に基づくため、長時間タブを開いたままだと "今日" がズレる可能性
  - 修正案: 影響軽微なので現状で OK。気になるなら React Query の `refetchOnWindowFocus` で対応可

- **`apps/web/components/notifications/announcements-widget.tsx:12-13`** — `FETCH_LIMIT = 100` は表示上限が 100 件想定。お知らせがそれ以上溜まった場合は表示漏れがある（無限スクロール無し）
  - 修正案: 現状の運用想定では問題なし。コメントで「100 件超は表示漏れ」を明記しておくと将来読みやすい

### 良い点

- `apps/web/app/(dashboard)/dashboard/page.tsx` — `_components/` ではなく shared `components/` 配下の各ウィジェットをマウントするだけの **薄いページ**。再利用性が高く、テスト容易。コード品質規約に沿っている
- `apps/api/src/events/events.controller.ts:30-33` — マジックナンバーを top-level の `const` に集約していて、レビュー時の意図が読み取りやすい
- `apps/web/components/calendar/upcoming-schedule-widget.tsx:19-20`, `apps/web/components/notifications/announcements-widget.tsx:11-13` — `WINDOW_DAYS` / `COLLAPSED_COUNT` / `FETCH_LIMIT` をモジュールトップに定数化していて、テストとの整合性が取りやすい
- `apps/web/i18n/request.ts:11` — `NAMESPACES` 配列で feature 単位の i18n message ファイルを統一管理。`dashboard` を追加するだけで済む拡張性
- `apps/web/messages/ja/dashboard.json` — 文字列を i18n 化していて UI 文言の集約場所が明確
- `apps/api/src/events/events.service.ts:1013-1090` — `findUpcoming` / `findMyUpcoming` ともに `select` で必要フィールドのみ取得（N+1 / 大量データの抜き出しを回避）
- `apps/web/test/test-utils.tsx` — `TestProviders` / `renderWithProviders` / `createHookWrapper` の Provider 集約ユーティリティ。今後の単体テストの一貫性を担保する基盤として優秀

---

## テスト (test-reviewer)

### 🔴 高（0 件）

なし（フレームワークが正式導入されたタイミングで、各層に対応する spec が同 PR で揃っている）

### 🟡 中（1 件）

- **`apps/api/src/events/events.service.spec.ts`** — 既存 `findAll` / 新規 `findUpcoming` / `findMyUpcoming` はテストされているが、**`participate` / `cancelParticipation` / `updateParticipantStatus` / `duplicate` 等の中核業務ロジックは未テスト**
  - 何が問題か: `events.service.ts` は 1188 行ある大規模サービスで、本 PR で spec ファイル自体は触れているが、追加された 3 つのテストブロック以外は他の公開メソッドが手付かず
  - 修正案: 本 PR スコープでは無いことを明示した上で、`describe.skip` で TODO を残す or 別 PR の宿題として記録
  - 注: 本 PR の **新規ロジックである `findUpcoming` / `findMyUpcoming` は十分にカバー** されているので、本 PR ブロックの理由にはならない

### 🟢 低（4 件）

- **`apps/api/src/events/events.service.spec.ts:26`** — `service = new EventsService(prismaMock as never, {} as never)` で `notificationsService` 部分を空オブジェクトで渡している
  - 修正案: 通知パスのテストを書く予定があるなら `{ create: jest.fn() }` のような最低限のモックに揃えると後で書きやすい

- **`apps/api/src/notifications/notifications.service.spec.ts`** — `findAll` のみテストされており、`create` / `markAsRead` / `getUnreadCount` 等は未テスト
  - 修正案: 本 PR スコープ外として OK。将来の追加候補としてメモ

- **`apps/api/src/schedules/schedules.service.spec.ts`** — `findAll` のみテストされており、`create` / `update`（権限チェック付き）/ `remove`（権限チェック付き）が未テスト
  - 修正案: `update` / `remove` は ForbiddenException / BadRequestException を投げる重要パスなので、次回追加候補

- **`apps/web/hooks/events/use-events.test.ts`** — `useUpcomingEvents` / `useMyUpcomingEvents` のみテストされている（`useEvents` / `useCreateEvent` / `useParticipate` 等の既存 hook は対象外）
  - 修正案: 本 PR スコープでは OK。フロント単体テストフレームワークが本 PR で本格導入されたので、今後段階的に追加する

### 良い点

- `apps/web/vitest.config.ts` + `apps/web/test/test-utils.tsx` で **`apps/web` 単体テストフレームワーク（Vitest + Testing Library）が本格導入**された。`*.test.ts` / `*.test.tsx` の規約通り
- `describe` / `it` のテキストが **全て日本語**で記述されており、CLAUDE.md テスト規約準拠
- `apps/web/hooks/auth/use-auth.test.tsx` — `AuthProvider` の外側でエラーになるケース、access token あり/なしの両分岐、`isAdmin` / `canEditAuthor` の権限ロジックを丁寧にカバー
- `apps/web/hooks/calendar/use-calendar.test.ts` — 引数あり/なし両方の経路をテスト
- `apps/web/components/calendar/upcoming-schedule-widget.test.tsx` — 「過去除外」「マージ並び順」「展開・折りたたみ」「バッジ表示」など重要ロジックを網羅的にカバー。Mock を `vi.mock` で hook 単位に分離していて読みやすい
- `apps/web/app/(dashboard)/dashboard/page.test.tsx` — 各ウィジェットをスタブ化してページレイヤの責務（ウェルカム文言 + ウィジェット順序）だけを検証している粒度設計が秀逸
- `apps/api/src/events/events.service.spec.ts` — 「`search` の pgroonga エスケープで空文字になる場合は通常一覧経路に dispatch」というエッジケース（行 48）まで含めていて網羅性が高い
- `apps/api/src/notifications/notifications.service.spec.ts` — `unreadOnly: false` で `isRead` が **条件に入らない**ことを `"isRead" in args.where` で検証していて、Prisma の where 条件を厳密にカバー

---

## 全体所感

### 規約準拠状況

- **フォルダ構成**: ✅ `app/(dashboard)/dashboard/` / `components/{events,calendar,notifications}/` / `hooks/{events,calendar,notifications,surveys}/` / `lib/api/events.ts` が同じドメイン名で揃っている
- **i18n**: ✅ `dashboard` namespace 新規追加、`request.ts` の `NAMESPACES` も追記、`common.json` に `collapse` / `showMoreCount` / `seeAll` の共通文言を追加
- **テスト規約**: ✅ 拡張子は `.spec.ts` (API) / `.test.tsx` (Web) の使い分けが正しい。日本語 `describe`/`it` も準拠
- **エラハン規約**: 🟡 新規箇所は規約準拠だが、既存の `use-events.ts` の個別 `onError + toast.error` 群は未整理（本 PR スコープ外）
- **セキュリティ規約**: 🟡 `limit` / `days` を DTO で受けるよう整理する余地あり（現状でも上限ガードは効いている）

### マイグレーション・スキーマ

- スキーマ変更なし（DB の `participants` / `event` / `schedule` / `notification` 等は既存）

### 推奨対応

- **本 PR でやる**: 特になし（リリースブロッカー無し）
- **次の PR で計画的に修正**:
  - `apps/api/src/events/events.controller.ts` の `getUpcoming` / `getMyUpcoming` を DTO 化（中優先）
  - `apps/web/components/notifications/announcements-widget.tsx` の `type` を配列で渡す（中優先）
  - `apps/web/hooks/events/use-events.ts` の個別 `onError + toast.error` を一掃（既存範囲）

---

## 関連

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラハン規約: `.claude/knowledge/error-handling-stack.md`
- CLAUDE.md（プロジェクト規約全体）
- 前回レビュー: `docs/reviews/2026-05-13-branch-board-tests.md`（同日別ブランチ）

> ⚠ このレビューは指摘のみで、コードの自動修正は行っていません。各項目を確認の上、修正するかどうかは自身で判断してください。
