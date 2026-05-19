---
date: 2026-05-19
scope: feature/videos-remove-category（dev からの差分: 47 ファイル / +1434 / −803）
branch: feature/videos-remove-category
reviewer: claude-code (/review)
agents: [security-reviewer, code-quality-reviewer, test-reviewer]
total_findings: 17
high: 3
medium: 8
low: 6
---

# レビュー結果: feature/videos-remove-category

> このレビューは指摘のみで、コードの自動修正は行っていません。
> 各項目を確認の上、修正するかどうかは自身で判断してください。
>
> 注: 本環境では Agent ツール（subagent spawn）が利用不可だったため、3 つのエージェント定義（`.claude/agents/`）をオーケストレーターが直接読み込み、観点別にレビューを実施しました。SSOT の規約自体は変更していません。

## サマリー

- 指摘事項: 17 件（🔴 高 3 / 🟡 中 8 / 🟢 低 6）
- 内訳: セキュリティ 5 / コード品質 8 / テスト 4
- 良い点: 12 件

PR の主目的（カテゴリ機能廃止 + 閲覧可能範囲廃止 + i18n 化 + 新規/編集フォームのシリーズ統合）は妥当に達成されている。一方で **動画パスワード検証エンドポイントの brute-force 対策が抜けている** こと（最重要）、`videos.controller.ts` の主要メソッドに `@ApiResponse` がほぼ無いこと、`recordView` がノーリミットで viewCount を水増しできる構造になっていることなど、PR 範囲外の既存問題も含めて整理した。

---

## セキュリティ (security-reviewer)

### 🔴 高（1 件） — リリース前必須対応

- **`apps/api/src/videos/videos.controller.ts:155-159` — `verifyPassword` に strict rate limit が無い（4桁数字パスワードの brute-force リスク）**
  - 動画パスワードは 4 桁の半角数字（`VIDEO_PASSWORD_PATTERN`）で空間が 10,000 しか無い。`@Throttle({ strict: ... })` が付いていないため、グローバルの緩い throttle のみで 1 分間に数千回試行が可能。`bcrypt.compare` のコストは 10round で 1 リクエストあたり ~100ms あり、CPU 負荷攻撃にもなり得る。CLAUDE.md セキュリティ規約「認証系 / パスワードリセット系 / 重い処理に `@Throttle({ strict: { limit: 5, ttl: 60_000 } })` を付ける」に明確に違反。
  - 修正案: コントローラ側で
    ```ts
    @Post(":id/verify-password")
    @Throttle({ strict: { limit: 5, ttl: 60_000 } })
    @ApiOperation({ summary: "動画パスワード検証" })
    verifyPassword(...) { ... }
    ```
    さらに、id 単位での失敗カウント（LoginAttemptService と同等の仕組み）を導入し、同一動画 × 同一ユーザーで一定失敗回数を超えたら一定時間ロックする運用が望ましい。
  - 関連: `CLAUDE.md` 「セキュリティ規約」 / `.claude/knowledge/security-hardening-stack.md` 層4

### 🟡 中（3 件） — 計画的に修正

- **`apps/api/src/videos/videos.controller.ts:70-75` — `recordView` がノーレート制限で viewCount を水増しできる**
  - `POST /videos/:id/view` は認証必須だが、同一ユーザーが何度でも呼べる。フロントでは「同一マウント内 1 回」のフラグ（`viewRecordedRef`）で抑止しているが、サーバ側に防御が無く、API を直叩きすれば誰でもカウントを増やせる。
  - 修正案: いずれか、または併用。
    1. `@Throttle({ default: { limit: 1, ttl: 30_000 } })` でユーザー単位 30秒1回に制限
    2. サービス側で `VideoWatchProgress` の `lastWatchedAt` を見て一定時間内なら increment しない
    3. 「view 用テーブル」を別に持って、UNIQUE(video_id, user_id, date) などで重複排除
  - 関連: `.claude/knowledge/security-hardening-stack.md` 層4

- **`apps/api/src/videos/videos.controller.ts:143-151` — `updateProgress` 入力に DTO/バリデーションが無い**
  - `@Body() data: { watchedSeconds: number; lastPositionSeconds: number; totalSeconds: number }` 直書きで `class-validator` を通っていない。例えば負数・極端な大値・小数・JSON 細工で `videos.service.ts:891` の `isCompleted = data.watchedSeconds >= data.totalSeconds * 0.9` の判定がねじれる可能性がある（例: `watchedSeconds=Number.MAX_SAFE_INTEGER` で常に完了扱い → ポイント付与 / 完了率の集計汚染）。
  - 修正案: `dto/update-watch-progress.dto.ts` を作って `@IsInt() @Min(0)` で 3 フィールドを検証する。
  - 関連: `CLAUDE.md` 「バリデーション・DTO」「セキュリティ規約 入力長制限」

- **`apps/api/src/videos/videos.controller.ts:163-171` / `185-196` — `Body` 直書きで型注釈のみ（バリデーション無し）**
  - `updateTaskStatus(@Body("status") status: "not_started" | "in_progress" | "completed")`、`sendTaskReminder(@Body() body: { userIds: string[] })` も同様。TS の Union 型は実行時に効かないため、不正な status 文字列がそのまま Prisma まで伝搬する。`userIds` も `@IsUUID({ each: true })` 等が欲しい。
  - 修正案: それぞれ DTO 化する。
  - 関連: `CLAUDE.md` 「バリデーション・DTO」

### 🟢 低（1 件）

- **`apps/api/src/videos/videos.service.ts:495-498` — `createForUpload` で `JSON.parse` がノーキャッチ**
  - multipart の `instructors` / `attachmentFileIds` / `tasks` 文字列を `JSON.parse` で素直にパースしている。不正 JSON で `SyntaxError` が出ると `AllExceptionsFilter` の「未知の Error → 500 / INTERNAL_ERROR」経路に落ちる（フィルタ的には正しいが、本来 400 で返したい）。
  - 修正案: `try/catch` で囲み、`BusinessException(ErrorCode.VALIDATION_FAILED, 400, ...)` を投げる。

## セキュリティ良い点

- `apps/api/src/videos/videos.service.ts:332-374` — `findOne` の戻り値で `passwordHash` を明示的に `undefined` に上書きしている（PII 漏洩防御）。
- `apps/api/src/videos/videos.service.ts:294-292` — admin/owner 以外は `publishStatus="published"` でフィルタしている（権限分離）。
- `apps/api/src/videos/videos.controller.ts:90,205` — `FileInterceptor` の `limits.fileSize: MAX_VIDEO_UPLOAD_BYTES` が両方の upload エンドポイントに付いている（DoS 防御）。
- `apps/api/src/videos/dto/*` — `@MaxLength` / `@ArrayMaxSize` / `@IsUUID` / `@IsEnum` などが網羅的に付いており、shared constants で値を共有している。
- `apps/api/prisma/migrations/20260517183801_drop_video_category/migration.sql` — `DROP CONSTRAINT IF EXISTS` / `DROP INDEX IF EXISTS` で冪等になっている。
- `packages/shared/src/constants/videos.ts` — マジックナンバーを 1 箇所に集約（バック/フロント共通）。

---

## コード品質 (code-quality-reviewer)

### 🔴 高（1 件） — 規約違反

- **`apps/web/hooks/videos/use-videos.ts:74-85, 87-116, 118-129, 161-178, 181-192` および `apps/web/app/(dashboard)/videos/new/page.tsx:51-73`、`apps/web/app/(dashboard)/videos/_components/video-password-dialog.tsx:60-63` — 個別 `onError: () => toast.error(...)` を新規に書いている（Phase 11.3 規約違反）**
  - `apps/web/app/providers.tsx:21-32` の `QueryCache.onError` / `MutationCache.onError` がグローバルに `handleApiError(error, t)` を呼ぶため、各 mutation で `onError: () => toast.error(...)` を書くと **重複トースト** になる（同じエラーで 2 つ通知が並ぶ）。CLAUDE.md「エラーハンドリング規約」および `.claude/knowledge/error-handling-stack.md` の「フロント: API エラーのトーストはグローバル `QueryCache.onError` 任せ、個別 `onError + toast.error` を書かない」に違反。
  - 参考: 既存の `useUpdateVideoProgress` / `useRecordVideoView` / `useUpdateTaskStatus` などは `onError` を持たず正しい実装。
  - 修正案: いずれか
    1. **個別 onError を削除**して全部グローバルに任せる（推奨。i18n メッセージは `messages/ja/errors.json` 経由）
    2. ドメイン特有メッセージを出したい場合は `meta: { silentError: true }` を付けてグローバルを抑止し、コンポーネント側で `extractApiError` から構造化エラーを取り出して `toast.error("...", { id: "..." })` で 1 箇所だけ表示
  - 補足: 同パターンが他 24 ファイルにも残存している（プロジェクト横断の既存問題）が、本 PR で **新規に追加された / 既存箇所を変更しているのに直していない** ものはまずここで止めるべき。
  - 関連: `CLAUDE.md` 「エラーハンドリング規約」 / `.claude/knowledge/error-handling-stack.md` 層3

### 🟡 中（4 件）

- **`apps/api/src/videos/videos.controller.ts` 全体 — `@ApiResponse()` がほぼ無い**
  - CLAUDE.md 規約「全エンドポイントに `@ApiTags()` / `@ApiOperation()` / `@ApiResponse()` が付いているか」のうち、`@ApiResponse()` がほとんど付いていない（`@ApiOperation` のみ）。Swagger UI で正常系・エラー系の型が確認できず、フロント開発の手戻りを生む。
  - 修正案: 主要エンドポイントに `@ApiResponse({ status: 200, type: ... })` / `@ApiResponse({ status: 404, description: "..." })` を追加。

- **`apps/api/src/videos/videos.service.ts:453-470` — `create` 内の「fileIds 付きタスクの個別 create」がループで個別 await（N+1 / 非トランザクション）**
  - `for` ループ内で `await this.prisma.videoTask.create(...)` を呼んでおり、(a) 親 `prisma.video.create` のトランザクション外に出ている、(b) N 件分のラウンドトリップ。タスク数が多い時にレスポンスが線形に遅くなり、途中失敗で部分作成のリスク。
  - 修正案: 親作成と一緒に `$transaction([...])` でまとめる、または `update` 系と同じく `prisma.$transaction(async (tx) => { ... })` に統一する。本サービスの `update` メソッドは `$transaction` を使っているので作成側だけ非対称になっている。
  - 関連: `CLAUDE.md` 「N+1 回避」「データ整合性」

- **`apps/api/src/videos/videos.service.ts:50-101 / 104-174` — `findAll` と `searchByPgroonga` で「currentUser を引いて isPrivileged を求める」ロジックが重複**
  - 同一の `prisma.user.findUnique({ where: { id }, select: { role: true } })` → `currentUser?.role === "admin" || "owner"` を 2 箇所に書いている。今後ロールが増えると両方を直す必要があり、片方を直し忘れる事故が起きやすい。
  - 修正案: private メソッド `private async isPrivilegedUser(userId?: string): Promise<boolean>` に切り出す。

- **`apps/web/app/(dashboard)/videos/[id]/edit/page.tsx` 全体 — フォームに React Hook Form / Zod を使わず `useState` の生組み立て**
  - CLAUDE.md 規約「フォーム管理に React Hook Form + `@hookform/resolvers/zod` を使用しているか」「バリデーションに `packages/shared` の Zod スキーマを使用しているか」のいずれも満たしていない。基本情報・公開設定・講師・タスクで合計 15 個近い `useState` が並ぶ構造で、保守性が低い。新規ページ（`new/page.tsx`）も同じ構造。
  - 修正案: 既存資産の確認をユーザーと相談の上、`react-hook-form` + Zod スキーマに移行を検討。なおこの PR の範囲外作業になる可能性が高いので、本指摘は **既存問題の記録**として残す目的が強い。

### 🟢 低（3 件）

- **`apps/web/app/(dashboard)/videos/_components/instructor-list.tsx:114-122` — `selectMember` の `catch {}` で詳細を握り潰している**
  - `usersApi.getUser` が失敗した時に黙ってフォールバック（affiliation を空文字に）する。グローバル `QueryCache.onError` 経由でないため、ユーザーに失敗が見えない。少なくとも `console.warn` / Sentry ブレッドクラム化が望ましい。

- **`apps/web/app/(dashboard)/videos/page.tsx:137-142` — `<img>` を直書きして `eslint-disable @next/next/no-img-element` を入れている**
  - 同 PR の `series-video-list.tsx:56-64` では `next/image` を正しく使えているので、`page.tsx` も `Image` + `sizes` で揃えると Lighthouse 指標が安定する（Cumulative Layout Shift 含む）。

- **`apps/api/src/videos/videos.service.ts:891` — `isCompleted = watchedSeconds >= totalSeconds * 0.9` のしきい値（0.9）がリテラル**
  - マジックナンバー。`packages/shared/src/constants/videos.ts` に `VIDEO_WATCH_COMPLETION_THRESHOLD = 0.9` として切り出し、UI 側の「次の動画 CTA（90%以上視聴で表示）」コメントとも一致させると良い（現状は文書とコードの 90% が暗黙連動）。

## コード品質 良い点

- `apps/api/src/videos/videos.service.ts:565-662` — `update` 全体が `prisma.$transaction` で包まれており、tasks の diff（追加・更新・削除）が atomic。
- `apps/api/src/videos/videos.service.ts:265-269 / 75-76` — admin/owner 以外への「公開動画 + 期限内」フィルタが `findAll` / `searchByPgroonga` / `findOne` の三経路で揃っている。
- `apps/api/prisma/migrations/20260517183801_drop_video_category/migration.sql:14-15` — Category モデルは他ドメインで使うため残し、scope='video' の行のみ削除する判断がコメントで明示されている（運用判断の記録として優秀）。
- `apps/web/app/(dashboard)/videos/[id]/page.tsx:33-36` — `hls.js` を `next/dynamic` で遅延 import（コメントでサイズ理由も明記）。Phase 11.2 の動的 import 規約に沿っている。
- `packages/shared/src/constants/videos.ts` — マジックナンバー集約 + コメントで「バック/フロント両方から参照」と意図が書かれている。
- `apps/web/app/(dashboard)/videos/error.tsx` — `ErrorFallback` を i18n 化 + `showReportDialog` を付与。`.claude/knowledge/error-handling-stack.md` の「重要なドメインのみ {feature}/error.tsx」運用と整合。

---

## テスト (test-reviewer)

### 🔴 高（1 件）

- **`apps/api/src/videos/videos.service.ts:475-551 createForUpload` および `apps/api/src/videos/videos.service.ts:697-725 updateTaskStatus` の正常系が未テスト**
  - `videos.service.spec.ts` は NOT_FOUND 等の異常系は手厚いが、`createForUpload`（multipart の JSON 文字列パース、`videoProvider="r2_hls"` 固定書き込み、`streamStatus="uploading"` 初期化）は **テスト 0 件**。同様に `updateTaskStatus` の `status="completed"` / `"in_progress"` ケースの完了日時セットと upsert 動作（CLAUDE.md 「状態遷移: enum / status / phase フィールドの各値での挙動が検証されているか」）が未網羅。`not_started` だけ検証されている。
  - 修正案: 以下のシナリオを追加。
    - `createForUpload` の正常系: instructors JSON / tasks JSON が正しく Prisma `createMany` に展開される
    - `updateTaskStatus` の `status="completed"`: `completedAt` が set される
    - `updateTaskStatus` の `status="in_progress"`: `completedAt: null`
  - 関連: `CLAUDE.md` 「テスト規約 / 状態遷移」

### 🟡 中（3 件）

- **`apps/api/src/videos/videos.service.spec.ts:139-157` — `update` 正常系（diff update）が未テスト**
  - `update` メソッドは tasks の追加・更新・削除を `$transaction` 内で `existingIds` / `incomingIds` で diff している複雑なロジックを持つが、spec は「動画が無い / 論理削除済み」の異常系 2 ケースだけ。実装の主要ロジックが未検証。
  - 修正案: モックされた `$transaction` で「既存 1 件残し + 新規 1 件追加 + 旧 1 件削除」のシナリオを書き、`tx.videoTask.update` / `tx.videoTask.create` / `tx.videoTask.deleteMany` が期待通り呼ばれるかを assert する。

- **`apps/api/src/videos/videos.service.spec.ts:108-137` — `recordView` の正常系で `viewCount: { increment: 1 }` の atomic 演算は検証しているが、`videos.service.ts:884-911 updateWatchProgress` の `isCompleted` フラグ判定（90% 境界）が未テスト**
  - 90% / 90% 未満 / `totalSeconds=0` などの境界値テストが無い。`isCompleted` の判定は実装の重要ロジック（完了率の集計、次動画 CTA、ポイント付与に影響）。
  - 修正案: `describe("updateWatchProgress: 完了判定")` を追加し、90% 境界（`watchedSeconds=89` / `90` で `isCompleted` の遷移）と `totalSeconds=0` のゼロ除算ケースを書く。

- **`apps/web/e2e/tests/videos/password.spec.ts:48-54` — テストが順序依存・前提が壊れやすい**
  - 「最初の行の編集ボタンを押す」 → 「保存」 → 「同じ行を再度編集」のフローで、テストが対象動画を特定していない。並列実行や seed の動画順序が変わると別動画にパスワードを設定してしまう。
  - 修正案: タイトル付きの動画行を `getByRole("row", { name: /タイトル/ })` で特定するか、testid を付ける。

### 🟢 低（2 件）

- **`apps/api/src/videos/videos.controller.spec.ts:14-23` — `serviceMock` を `Partial<Record<keyof VideosService, jest.Mock>>` で書いており、メソッド名のタイプミスが型では検出できない**
  - 軽微。`MockProxy<VideosService>` 等の方が安全だが、現状でも実害は少ない。

- **`apps/web/e2e/tests/videos/task-progress.spec.ts:27` — `test.skip(!hasTaskProgress, ...)` が脆い**
  - seed の最初の 5 本がタスクを持つ前提（コメントあり）だが、`SeriesVideoList` で `limit: 100` を取って 1 つ目を選ぶため、シリーズ順序が変わるとタスクなし動画にぶつかる。seed と組み合わせて「タスク有り動画を必ず引く」テストヘルパを作るとよい。

## テスト良い点

- `apps/api/src/videos/videos.service.spec.ts` 全体 — `describe` / `it` がすべて日本語で書かれており、CLAUDE.md「テスト規約」に完全準拠。`messageKey` まで `toMatchObject` で assert していて、i18n 経路の回帰検知が効く。
- `apps/api/src/common/filters/all-exceptions.filter.spec.ts:223-305` — videos モジュール固有の 4 つの `messageKey`（`errors.not_found.video` / `errors.not_found.video_task` / `errors.unauthorized_resource.video_password` / `errors.validation.video_file_required`）が `i18n.translate` に正しく渡されることを spec として残している。i18n の鍵だけがズレる類の事故を防げる構造で優秀。
- `apps/api/src/videos/videos.controller.spec.ts:38-47` — file 未指定時に投げられる `BusinessException` の `getStatus()` まで検証している（HTTP ステータス退行検知）。
- `apps/web/e2e/tests/videos/{manage,new,password,task-progress}.spec.ts` — admin / member の `storageState` を切り替えてロールベース UI を検証している。`getByRole("heading"/"columnheader")` 中心で書かれており、i18n 文字列のリファクタに比較的強い。

---

## 関連

- セキュリティ規約: `.claude/knowledge/security-hardening-stack.md`
- エラハン規約: `.claude/knowledge/error-handling-stack.md`
- パフォーマンス規約: `.claude/knowledge/performance-stack.md`
- 前回レビュー: `docs/reviews/2026-05-18-branch-albums-i18n-and-tests.md`
