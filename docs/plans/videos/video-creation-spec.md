# 動画新規作成の仕様拡張 実装計画

> **最終配置先（承認後移動）**: `docs/plans/videos/video-creation-spec.md`
> （`/plan` スキル使用時の CLAUDE.md ルールに準拠）

## Context

現在の動画新規作成画面（`apps/web/app/(dashboard)/videos/new/page.tsx`）には `title / description / categoryId / seriesId / file` しかなく、仕様書で要求される以下の項目が未実装:

- 順番（シリーズ内 watchOrder）
- 担当講師（複数・内部/外部講師混在）
- 配布資料（ファイル添付）
- 閲覧可能範囲（複数ロール許可リスト）
- 閲覧期限（availableUntil）
- パスワード設定（4桁数字）
- 公開ステータス（publishStatus）
- **タスク**（視聴後に行う作業の管理。メンバーが完了チェック、管理者は全体進捗を参照）

DB スキーマには `Video.watchOrder / availableUntil / passwordHash / publishStatus / viewPermission / requiredRankId`、中間テーブル `VideoInstructor / VideoAttachment / VideoTask / VideoTaskCompletion` がすでに存在する。ただし:

- `VideoInstructor` は `userId` が必須で外部講師に未対応（講師名/所属も持たない）
- `viewPermission` は `all | rank_restricted` のみで「ロール許可リスト」未対応
- `VideoTask` は詳細ページで read-only 表示されているだけで、作成/編集 UI・完了チェック UI・管理者用進捗 UI が未実装
- バックエンド DTO とフロント UI が未拡張（作成・編集・詳細いずれも）

本計画はこれらを埋めて仕様と実装を揃える。対象画面は **新規作成・編集・詳細** の 3 つすべて。

## ユーザー確認済み方針

| 項目               | 方針                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| 閲覧可能範囲       | 複数ロールの許可リスト（admin/owner/member をチェックボックス複数選択） |
| 順番 (watchOrder)  | 手動入力（数値）、空欄可                                                |
| パスワード検証単位 | セッション中1回のみ（sessionStorage で記憶）                            |
| 講師 UI            | `EventSpeaker` モデル（`userId? + name + title`）と同パターンに合わせる |

## スキーマ変更（migration: `phase11_video_new_spec`）

### 1. `VideoInstructor`（`apps/api/prisma/schema.prisma:1792-1806`）

`EventSpeaker` と同構造に変更:

```prisma
model VideoInstructor {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  videoId        String   @map("video_id") @db.Uuid
  userId         String?  @map("user_id") @db.Uuid       // 外部講師のため nullable 化
  name           String   @db.VarChar(100)               // 追加（内部/外部とも必須）
  affiliation    String?  @db.VarChar(200)               // 追加: 所属/肩書
  sortOrder      Int      @default(0) @map("sort_order")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz()

  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)
  user  User? @relation(fields: [userId], references: [id])

  // 既存の @@unique([videoId, userId]) は外部講師（userId=null）で衝突しないので維持
  @@index([userId])
  @@map("video_instructors")
}
```

### 2. `Video.viewPermission` / 閲覧範囲

`VideoViewPermission` enum に `role_restricted` を追加、`Video.allowedRoles String[]` を追加:

```prisma
enum VideoViewPermission {
  all
  rank_restricted
  role_restricted   // 追加
}

model Video {
  ...
  allowedRoles  String[]  @default([]) @map("allowed_roles")   // 追加（UserRole 値の配列）
  ...
}
```

`viewPermission = role_restricted` のときのみ `allowedRoles` を参照。既存 `rank_restricted` は維持。

## バックエンド変更

### `apps/api/src/videos/dto/create-video.dto.ts` & `update-video.dto.ts`

以下フィールドを追加（optional、`class-validator` で検証）:

- `watchOrder?: number`（`@IsInt @Min(0)`）
- `publishStatus?: "draft" | "published" | "unpublished"`
- `availableUntil?: string`（ISO 日時）
- `viewPermission?: "all" | "rank_restricted" | "role_restricted"`
- `allowedRoles?: string[]`（`@IsIn(["admin","owner","member","visitor"], { each: true })`）
- `password?: string`（`@Matches(/^\d{4}$/)`、`null` / 空文字でクリア）
- `instructors?: Array<{ userId?: string; name: string; affiliation?: string }>`
- `attachmentFileIds?: string[]`
- `tasks?: Array<{ id?: string; title: string; description?: string; sortOrder?: number }>` — id 付きは更新、なしは新規作成。update 時は含まれない既存タスクを削除

### `apps/api/src/videos/videos.service.ts`

- `createForUpload`（137-153行）を拡張: 上記フィールドを受け取り、`Video` を作成後に `VideoInstructor.createMany` / `VideoAttachment.createMany` / `VideoTask.createMany` を同一トランザクションで実行
- `password` は `bcrypt.hash` で保存（既存 `passwordHash` フィールドに格納。null/空で `{ passwordHash: null }` に）
- `update` も同様に関係テーブルを差分更新（instructors/attachments は deleteMany→createMany パターン。tasks は「id 一致=更新 / id 付き未送信=削除 / id なし=新規」）
- `findOne` の include に `tasks` は既存、`instructors` と `attachments` も既に含まれる（91行）。レスポンス整形で講師の `name / affiliation / userId / avatarUrl` を返す

### 新規エンドポイント: パスワード検証

`videos.controller.ts` に追加:

```ts
@Post(":id/verify-password")
verifyPassword(
  @Param("id", ParseUUIDPipe) id: string,
  @Body("password") password: string,
) {
  return this.service.verifyPassword(id, password);  // bcrypt.compare → { ok: true } or 401
}
```

### 新規エンドポイント: タスク完了・進捗

`videos.controller.ts` に追加:

```ts
// メンバー自身の完了チェック（toggle）
@Post("tasks/:taskId/complete")
completeTask(@Param("taskId") taskId: string, @CurrentUser("id") userId: string) {
  return this.service.completeTask(taskId, userId);
}

@Delete("tasks/:taskId/complete")
uncompleteTask(@Param("taskId") taskId: string, @CurrentUser("id") userId: string) {
  return this.service.uncompleteTask(taskId, userId);
}

// 管理者用: 動画単位の全員進捗
@Get(":id/task-progress")
@UseGuards(RolesGuard)
@Roles("admin", "owner")
getTaskProgress(@Param("id", ParseUUIDPipe) id: string) {
  return this.service.getTaskProgress(id);
  // returns: { tasks: [{ id, title, completedBy: [{ userId, name, completedAt }], completionCount, totalMembers }] }
}
```

- メンバー視点の `findOne` レスポンスには `tasks[].completedByMe: boolean, tasks[].completedAt?: string` を付与
- `getTaskProgress` は VideoTaskCompletion を集計。`totalMembers` は `User.role IN ('admin','owner','member')` の未削除ユーザー数

### 閲覧制御

`findOne` / 視聴ストリーム取得時に `viewPermission = role_restricted` の場合 `currentUser.role ∈ allowedRoles` をチェック。rank_restricted は既存ロジック維持。

## フロントエンド変更

### 型定義 `apps/web/lib/api/types.ts`

- `VideoDetail.instructors[].userId` を nullable 化、`affiliation` フィールド追加
- `Video` 型に `allowedRoles`, `availableUntil`, `viewPermission`, `hasPassword` を追加
- `VideoDetail.tasks[]` に `completedByMe: boolean`, `completedAt?: string` を追加
- `CreateVideoPayload` / `UpdateVideoPayload` 型を新設（`tasks` フィールド含む）
- `VideoTaskProgress` 型を新設（管理者用）

### 既存コンポーネントの再利用

- **ファイル添付（配布資料）**: `apps/web/components/file-upload-list.tsx` の `FileUploadList` を `fileCategory="document"` で利用（album 新規作成での実装と同パターン）
- **公開ステータス**: `apps/web/lib/constants/publish-status.ts` の `PUBLISH_STATUS_OPTIONS` + `SelectField`
- **ユーザー検索**: `useMembers({ search })` フック（`apps/web/hooks/members/use-members.ts`）をデバウンス付き combobox でラップ

### 新規コンポーネント `apps/web/app/(dashboard)/videos/_components/instructor-list.tsx`

`EventSpeaker` 構造をモデルにした入力リスト:

```
┌─────────────────────────────────────────┐
│ 担当講師                                 │
│ [+ 自分を講師として追加]                  │← 現在ユーザーを1行追加するショートカット
│                                         │
│ ─ 講師1 ────────────────────────        │
│  ☐ 外部講師                             │← チェックで内部↔外部切替
│  [内部モード]                            │
│    ユーザー: [検索コンボボックス ▼]       │← useMembers で検索
│    ※選択時、名前と所属を自動補完         │
│    名前:  [ ○○ ]                        │
│    所属:  [ ○○ ]                        │
│  [外部モード]                            │
│    名前:  [     ]（必須）               │
│    所属:  [     ]                       │
│                                         │
│ [× 削除]                                │
│ ─────────────────────────────────       │
│ [+ 講師を追加]                          │
└─────────────────────────────────────────┘
```

- 自動補完ソース: `User.name` と `UserAffiliation`（最初の sortOrder のもの）から `organizationName / title` を連結
- 「自分を講師として追加」は `useAuth().user` で現在ユーザーを内部モードで1行追加
- props: `value: InstructorInput[]`, `onChange`

### 新規コンポーネント `apps/web/app/(dashboard)/videos/_components/access-roles-field.tsx`

- チェックボックス群: admin / owner / member
- props: `value: string[]`, `onChange`
- `viewPermission = role_restricted` をセットで使う（値なしなら `all`、rank 系は別 UI で）

### 新規コンポーネント `apps/web/app/(dashboard)/videos/_components/task-list-editor.tsx`

作成・編集フォームで使うタスクリスト編集 UI:

```
┌────────────────────────────────────────┐
│ タスク（視聴後に行う作業）              │
│ ─ タスク1 ─────────────────────        │
│  タイトル: [ 視聴後のレポートを提出 ]   │
│  説明:     [ ... (任意) ]             │
│  [× 削除] [↑↓ 並び替え]               │
│ [+ タスクを追加]                       │
└────────────────────────────────────────┘
```

- props: `value: TaskInput[]`, `onChange`
- 並び替えはシンプルに ↑↓ ボタンで sortOrder を書き換える

### `apps/web/app/(dashboard)/videos/new/page.tsx` の改修

以下のフィールドを追加し、`POST /videos/upload` の multipart body に含める:

- 順番（`seriesId` が設定されているときのみ表示）
- 担当講師リスト（`InstructorList`）
- 配布資料（`FileUploadList`）
- 閲覧可能範囲（`AccessRolesField`、`role_restricted` 時のみ表示。デフォルトは「すべて」）
- 閲覧期限（`Input type="datetime-local"`）
- パスワード（`Input type="password" inputMode="numeric" pattern="\d{4}" maxLength={4}`、空欄可）
- 公開ステータス（`SelectField` + `PUBLISH_STATUS_OPTIONS`）
- タスクリスト（`TaskListEditor`）

### `apps/web/app/(dashboard)/videos/[id]/edit/page.tsx` の改修

**新規作成と同じフィールド構成に揃える**（動画ファイル差し替えは対象外。メタデータのみ）:

- `useVideo(id)` で初期値ロード → 上記と同じフォームを表示
- 送信は `PATCH /videos/:id`。`useUpdateVideo` で既存 mutation を拡張
- パスワード欄は現状「設定済み」の場合プレースホルダー「●●●●」、空送信で変更なし・明示的クリアは「パスワード削除」ボタンで

### `apps/web/app/(dashboard)/videos/[id]/page.tsx`（詳細ページ）の拡張

既存の基本表示に加えて以下を追加:

- **講師セクション**: `instructors[]` を横並び表示（アバター or 頭文字 / 名前 / 所属）。Event 詳細ページの登壇者表示 (`events/[id]/page.tsx:240-258`) と同じレイアウト
- **閲覧期限バナー**: `availableUntil` が近い/過ぎている場合、日付を上部カードに明示
- **アクセス制限バッジ**: `viewPermission = role_restricted` なら「限定: admin, owner」のようにロール一覧を表示
- **配布資料カード**: `attachments[]` を `a[download]` リンクのリストで表示（FileUploadList の表示部分と同じスタイル）
- **シリーズ順序インジケータ**: シリーズ所属時、同シリーズ内 watchOrder と前後動画へのナビ
- **タスクカード**: 既存の read-only 表示（`videos/[id]/page.tsx:101-117`）を **完了チェック可能に変更**:
  - 行ごとにチェックボックス。クリックで `POST /videos/tasks/:taskId/complete` / `DELETE`（toggle）
  - `completedByMe === true` なら checked 状態
  - 全タスク完了でカード下部に「タスク完了！」表示
- **視聴時パスワード制御**: `hasPassword === true` かつ `sessionStorage.videosUnlocked` に `id` が含まれない場合、プレーヤーを隠してパスワード入力ダイアログを表示。`POST /videos/:id/verify-password` が OK を返したら sessionStorage に id を追加。sessionStorage は各タブで独立、タブ閉じで失効＝「セッション中1回のみ」

### 新規ページ `apps/web/app/(dashboard)/videos/[id]/task-progress/page.tsx`（管理者用進捗）

- admin/owner のみアクセス可（`AdminGuard` など既存ガードで制御）
- `GET /videos/:id/task-progress` で取得
- 表示: タスクごとに完了人数 / 全対象者数、完了ユーザーのリスト（名前＋完了日時）
- **未完了ユーザーリスト**: 各タスクごとに未完了ユーザー（チェックボックス選択可）
- **「リマインドを送る」ボタン**: 選択した未完了ユーザーに通知を一括送信（下記 API）
- 動画詳細ページから admin/owner の場合のみ「タスク進捗を見る」ボタンを表示してリンク

### タスクリマインド通知（アプリ内通知のみ）

**API 追加** (`videos.controller.ts` / `videos.service.ts`):

```ts
@Post(":id/tasks/:taskId/remind")
@UseGuards(RolesGuard)
@Roles("admin", "owner")
sendTaskReminder(
  @Param("id", ParseUUIDPipe) videoId: string,
  @Param("taskId") taskId: string,
  @CurrentUser("id") actorUserId: string,
  @Body() body: { userIds: string[] },  // 指定ユーザーのみに送る。空配列時は全未完了ユーザー
) {
  return this.service.sendTaskReminder(videoId, taskId, actorUserId, body.userIds);
}
```

- `VideoTask` と `Video.title` を取得
- 対象ユーザー絞り込み: `body.userIds` が空なら対象者全員（`role IN ('admin','owner','member')`）から `VideoTaskCompletion` を引いた未完了者
- 既存の `NotificationsService.create` を対象ユーザー分ループで呼ぶ（または `prisma.notification.createMany`）
  - `type: "video_task_reminder"`
  - `title: "未完了タスクがあります: {videoTitle}"`
  - `body: "「{taskTitle}」を完了してください"`
  - `referenceType: "video"`, `referenceId: videoId`
  - `actorUserId: actorUserId`（送った管理者）
- フロント: 既存の通知一覧（`apps/web/app/(dashboard)/notifications/`）で表示。クリック時 `referenceId` で動画詳細に遷移するのは既存通知クリックハンドラを拡張
- 通知詳細側（`notifications.controller.ts`）は新 type を受け付けるが、レンダリングはタイトル/本文で十分なので既存処理で OK

### 視聴順序誘導（次の動画へ）

- `videos.service.ts` の `findOne` レスポンスに、シリーズ所属時は以下を付与:
  - `prevVideo?: { id, title, watchOrder }` — 同シリーズで `watchOrder < 自分` の最大
  - `nextVideo?: { id, title, watchOrder }` — 同シリーズで `watchOrder > 自分` の最小
- `videos/[id]/page.tsx`: 視聴完了（90% 以上）時に「次の動画へ」CTA を表示。プレーヤー下に「シリーズ内 {i} / {n}」進行度表示
- シリーズ詳細（現状なし）は本スコープ外（`/videos` 一覧にシリーズフィルタ追加で代替）

### 動画一覧のフィルタ拡張

`apps/web/app/(dashboard)/videos/page.tsx` にフィルタを追加:

- 閲覧可能範囲（`all` / `role_restricted` / `rank_restricted`） — admin/owner のみ
- 公開ステータス（draft / published / unpublished） — 既存 `PublishStatusFilter` があれば再利用、なければ `SelectField`
- タスク進捗（自分視点: 未完了タスクあり / 全て完了 / タスクなし）

バックエンド `VideoQueryDto` にフィルタ項目を追加、`findAll` の where 句で反映。

### 動画ファイル差し替え（編集）

`videos/[id]/edit/page.tsx` に「動画ファイルを差し替え」セクションを追加:

- 現在の動画情報（サムネ・時間）を表示
- 差し替えは任意（デフォルト非表示、「差し替える」トグルで出現）
- 差し替え時は新規作成と同じ `POST /videos/upload` 系のロジックで再変換 → streamStatus を `processing` に戻す
- API: `POST /videos/:id/replace-file`（admin/owner のみ）で動画ファイルのみ受け取り、`VideoProcessorService.processVideo` を再実行
- 差し替え中は再生不可（streamStatus !== "ready" のときは処理中表示）

## 影響範囲

| 層                 | 変更ファイル                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema             | `apps/api/prisma/schema.prisma`、migration 1本追加                                                                                                                                                  |
| API DTO            | `apps/api/src/videos/dto/create-video.dto.ts`, `update-video.dto.ts`, `video-query.dto.ts`                                                                                                          |
| API Controller     | `apps/api/src/videos/videos.controller.ts`（verify-password / タスク完了 / 管理者進捗 / リマインド / ファイル差し替え 追加）                                                                        |
| API Service        | `apps/api/src/videos/videos.service.ts`（create / update / findOne（prev/next含む） / verifyPassword / completeTask / uncompleteTask / getTaskProgress / sendTaskReminder / replaceFile）           |
| API 依存           | `apps/api/src/videos/videos.module.ts` に `NotificationsModule` import を追加                                                                                                                       |
| Types              | `apps/web/lib/api/types.ts`                                                                                                                                                                         |
| API Client         | `apps/web/lib/api/videos.ts`（各種エンドポイント追加）                                                                                                                                              |
| Hooks              | `apps/web/hooks/videos/use-videos.ts`（useVerifyVideoPassword / useToggleTaskCompletion / useVideoTaskProgress / useSendTaskReminder / useReplaceVideoFile 追加）                                   |
| Pages（既存改修）  | `videos/new/page.tsx`, `videos/[id]/page.tsx`, `videos/[id]/edit/page.tsx`, `videos/page.tsx`（一覧フィルタ拡張）                                                                                   |
| Pages（新規）      | `videos/[id]/task-progress/page.tsx`（admin/owner 用）                                                                                                                                              |
| Components（新規） | `_components/instructor-list.tsx`, `_components/access-roles-field.tsx`, `_components/task-list-editor.tsx`, `_components/video-password-dialog.tsx`, `_components/series-nav.tsx`（前/次動画ナビ） |

edit 画面は new と同フィールド構成に揃える。一覧画面・manage 画面の列表示は今回スコープ外（必要なら別計画）。

## 既存資産の利用可否

| 要求               | 既存資産                                                                                  | 判断                                                          |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 配布資料 UI        | `FileUploadList`（album/memo で利用中）                                                   | そのまま利用                                                  |
| 公開ステータス UI  | `PUBLISH_STATUS_OPTIONS` + `SelectField`                                                  | そのまま利用                                                  |
| ユーザー検索       | `useMembers`（getAll + search param）                                                     | そのまま利用（combobox ラッパーを新設）                       |
| 講師データモデル   | `EventSpeaker`（同構造）                                                                  | `VideoInstructor` を同形に変更                                |
| 閲覧範囲ロール許可 | `PermissionSetting.allowedRoles` の JSON 配列パターン                                     | 考え方を踏襲し `Video.allowedRoles String[]`                  |
| 内部/外部トグル UI | VenuePicker（select+dialog パターン）                                                     | 構造が違うため **新規 InstructorList が必要**                 |
| アプリ内通知送信   | `NotificationsService.create`（`apps/api/src/notifications/notifications.service.ts:11`） | そのまま利用（VideosModule に NotificationsModule を import） |
| 通知一覧表示       | `/notifications/` 既存 UI                                                                 | そのまま利用（新 type でもタイトル/本文で表示可）             |
| 動画処理           | `VideoProcessorService.processVideo`（HLS 変換）                                          | ファイル差し替え時にそのまま再利用                            |

## 検証方法

1. `pnpm -C apps/api prisma migrate dev --name phase11_video_new_spec` でマイグレーション作成・適用
2. `pnpm -C apps/api build && pnpm -C apps/web build` でビルド通過確認
3. `pnpm -C apps/web dev` で起動、以下を手動テスト:
   - **新規作成**: 全フィールド空に近い状態でも通る / シリーズ選択時のみ順番が入力できる / 「自分を講師として追加」で現在ユーザーが内部モードで1行追加される / 外部講師チェックで入力欄に切り替わり、名前必須 / 配布資料が複数添付できる / 閲覧範囲「ロール制限」で admin/owner/member を選択 / パスワード 4 桁設定 / 公開ステータス = 下書き / タスク複数入力
   - **編集画面**: 既存動画を編集しても同フィールドが初期値付きで表示 / 変更→保存で反映 / タスクの追加・削除・並び替え / パスワードの変更とクリア
   - **詳細ページ**: 追加した項目（講師・配布資料・閲覧期限・アクセス制限・シリーズ順序）が表示される / タスクチェックで `completedByMe` が切り替わる / 全タスク完了で完了表示
   - **パスワード**: 4 桁設定動画を別タブで視聴時にダイアログが出る / 同セッションなら再入力不要
   - **閲覧制限**: 閲覧期限を過ぎた動画は閲覧できない / role_restricted で許可外ロールは見れない / 公開ステータス = 下書きの動画は member 側で非表示
   - **管理者タスク進捗**: admin/owner が `/videos/:id/task-progress` で全員の完了状況を確認できる / member はアクセス不可（403 or ガード）
   - **リマインド通知**: admin/owner が未完了ユーザーを選択してリマインド送信 → 対象ユーザーの通知一覧に表示される / 通知クリックで動画詳細に遷移
   - **視聴順序誘導**: シリーズ動画の 90% 視聴後、次の動画へのリンクが出る / 最終話ではリンクなし
   - **動画ファイル差し替え**: 編集画面で別ファイルをアップロード → streamStatus が processing → 完了後に新しい動画で再生できる
   - **一覧フィルタ**: 公開ステータス / 閲覧範囲 / 自分のタスク進捗で絞り込める
4. API 層: `apps/api` の Swagger UI (`/api/docs`) で 4桁以外のパスワードが 400 を返すこと / リマインド送信時に対象外ユーザー（完了済）には通知が作られないこと

## 非スコープ

- 外部講師の独立マスター化（本計画では VideoInstructor に denormalize。マスター運用は別計画）
- タスクリマインドのプッシュ通知・メール送信（**本計画はアプリ内通知のみ**。外部チャネルは既存通知設定の枠組みと合わせて別計画）
- タスク完了時の自動ポイント付与（PointHistory 連携 — 別計画）
- 視聴期限切れの自動アーカイブ（バッチ処理 — 別計画）
