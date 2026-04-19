# 配信機能 統合リファクタ 実装計画

## 背景

現状、ユーザーへの通知手段が複数の画面・モジュールに分散している。

| 既存実装               | 場所                                     | 状態                                        |
| ---------------------- | ---------------------------------------- | ------------------------------------------- |
| グローバルメール配信   | `/mail`                                  | 画面は実装済み、送信は Resend 未統合で MOCK |
| イベントメール配信     | `/events/[id]/mail`                      | メニュー項目のみ、画面はプレースホルダ      |
| イベント参加者一括通知 | `/events/[id]/participants` のダイアログ | アプリ内通知のみ実装                        |

また、将来的にメール・LINE の実送信を追加する予定だが、現在は **アプリ内通知（Notification テーブル）** しか稼働していない。

## ゴール

1. **「配信（Broadcast）」** という単一の概念に集約し、スコープ（グローバル / イベント）とチャネル（in_app / email / line）を直交させる
2. フロントのフォーム UI を **グローバル / イベント双方で共通化**（対象者セレクタのみ差し替え）
3. バックエンドをチャネル抽象化し、将来の email / line 実装時に送信ロジック以外を変更しないで済む構造にする
4. 既存の「メール配信」「一括通知」を「配信」に **rename** し、呼称を統一する

## 用語と定義

| 用語                    | 定義                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| **配信 (Broadcast)**    | 1回の送信操作。複数チャネル・複数宛先にまたがる集約ルート                |
| **スコープ (scope)**    | 配信の適用範囲。`global`（全社一斉） / `event`（特定イベント参加者）     |
| **チャネル (channel)**  | 配信の物理的な経路。`in_app` / `email` / `line`                          |
| **通知 (Notification)** | アプリ内通知の個別レコード。配信の結果として `in_app` チャネルが作成する |

## 主要な決定事項

| #   | 決定                                                                        |
| --- | --------------------------------------------------------------------------- |
| 1   | URL: `/mail` → `/broadcasts` にリネーム（リダイレクト設定）                 |
| 2   | DB テーブル: `MailMessage` 系 → `Broadcast` 系にリネーム                    |
| 3   | `NotificationPreference` を尊重し、チャネル OFF のユーザーには送らない      |
| 4   | 閲覧権限: グローバル配信は admin のみ、イベント配信はイベント運営者 + admin |
| 5   | 実装順序: バックエンド先行                                                  |
| 6   | `MailTemplate` → `BroadcastTemplate` にリネーム                             |

## アーキテクチャ

```
┌─ Frontend ────────────────────────────────────────┐
│  <BroadcastForm>                                  │
│    ├─ <TitleBodyFields>                           │
│    ├─ <ChannelSelector>  in_app/email/line        │
│    ├─ <ScheduleField>                             │
│    └─ {audienceSelector}   ← props で注入        │
│                                                   │
│  <AudienceSelectorGlobal>  (all/rank/custom)     │
│  <AudienceSelectorEvent>   (status絞り込み)      │
│                                                   │
│  <BroadcastHistoryTable>                         │
│  <BroadcastDetail>                               │
└───────────────────────────────────────────────────┘
                      │
                      ▼
┌─ Backend ─────────────────────────────────────────┐
│  POST /broadcasts                                 │
│    ├─ scope: 'global' | 'event'                   │
│    ├─ channels: ['in_app', 'email', 'line']       │
│    ├─ targetType: all/rank/custom/event           │
│    └─ targetFilter: { eventId?, rankId?, ... }    │
│                                                   │
│  BroadcastDispatcher                              │
│    ├─ resolveRecipients(targetType, filter)      │
│    ├─ InAppDispatcher  → NotificationsService    │
│    ├─ EmailDispatcher  → ResendService (スタブ)  │
│    └─ LineDispatcher   → (TODO)                  │
│    ※ NotificationPreference で各チャネル OFF を除外 │
└───────────────────────────────────────────────────┘
```

## 既存資産の再利用方針

| 既存資産                             | 扱い                                                    |
| ------------------------------------ | ------------------------------------------------------- |
| `MailMessage` テーブル               | **rename** → `Broadcast`、`channels` / `scope` 追加     |
| `MailMessageRecipient`               | **rename** → `BroadcastRecipient`、`channel` カラム追加 |
| `MailMessageAttachment`              | **rename** → `BroadcastAttachment`                      |
| `MailTemplate`                       | **rename** → `BroadcastTemplate`                        |
| `MailSuppression`                    | **rename** → `BroadcastSuppression`                     |
| `MailTargetType` enum                | **rename** → `BroadcastTargetType`                      |
| `MailStatus` enum                    | **rename** → `BroadcastStatus`                          |
| `resolveRecipients()`                | **拡張** — `targetType='event'` 対応                    |
| `NotificationsService.createMany()`  | **そのまま使う**（`InAppDispatcher` から呼ぶ）          |
| `MailService`（Resend スタブ）       | **`EmailDispatcher` に統合**                            |
| `events.notifyParticipants()`        | **互換ラッパ化** — 内部で `/broadcasts` を呼ぶ          |
| 参加者ページの「一括通知」ダイアログ | **削除** → 配信画面への導線に置換                       |
| `/mail/*` ページ                     | **削除** → `/broadcasts/*` にリダイレクト               |

## Phase 分割

### Phase 1: バックエンド抽象化（破壊的 rename + dispatcher 追加）

#### 1-a. Prisma schema + マイグレーション

- モデル・enum を `Broadcast*` にリネーム
- 物理テーブル名（`@@map`）も `broadcasts` 等に更新
- 新カラム:
  - `Broadcast.channels String[]` default `['email']`
  - `Broadcast.scope String` default `'global'`
  - `BroadcastRecipient.channel String`
- enum `BroadcastStatus` / `BroadcastTargetType` に `@@map` で PostgreSQL enum 名も更新
- `ALTER TABLE RENAME` + `ALTER TYPE RENAME` を1マイグレーションで

#### 1-b. バックエンドディレクトリ / クラス rename

- `apps/api/src/mail/` → `apps/api/src/broadcasts/`
- クラス名: `MailMessagesService` → `BroadcastsService`、`MailTemplatesService` → `BroadcastTemplatesService`、etc.
- コントローラ: `GET/POST /mail/messages` → `GET/POST /broadcasts`
- DTO 名も `CreateMailMessageDto` → `CreateBroadcastDto` など
- `app.module.ts` のインポート・Module 名更新

#### 1-c. `BroadcastDispatcher` 新設

配置: `apps/api/src/broadcasts/dispatchers/`

```
dispatchers/
├─ broadcast-dispatcher.ts        (orchestrator)
├─ in-app.dispatcher.ts
├─ email.dispatcher.ts
└─ line.dispatcher.ts             (TODO スタブ)
```

- 各 dispatcher は `dispatch(broadcast, recipients)` インターフェース
- `NotificationPreference` を参照し OFF のユーザーを除外
- `BroadcastRecipient` レコードを `channel` 単位で作成し、送信結果（sent/failed）を記録

#### 1-d. `resolveRecipients()` 拡張

- `targetType='event'` のとき `targetFilter.eventId` から `EventParticipant` を取得
- キャンセル以外の参加者に限定（現行 `notifyParticipants` の挙動を踏襲）

#### 1-e. 権限ガード

- `scope='global'`: `@Roles('admin')` のみ作成・閲覧可
- `scope='event'`: `targetFilter.eventId` のイベント運営者（owner）または `admin` のみ
  - `EventOwnerGuard` 的なカスタムガードを新規 or 既存の仕組みを流用

#### 1-f. 互換ラッパ

- `POST /events/:id/participants/notify` は残す
- 内部で `BroadcastsService.create()` を `{ scope: 'event', channels: ['in_app'], targetType: 'event', targetFilter: { eventId } }` で呼ぶ
- レスポンス形式（`{ notifiedCount }`）は維持

### Phase 2: フロント共通コンポーネント

配置: `apps/web/components/broadcasts/`

```
components/broadcasts/
├─ broadcast-form.tsx            React Hook Form + zod
├─ channel-selector.tsx          in_app/email/line チェックボックス
│                                 email/line は当面 disabled + ツールチップ
├─ audience-selector-global.tsx  all/rank/custom
├─ audience-selector-event.tsx   参加ステータス絞り込み (applied/attended/no_show)
├─ broadcast-history-table.tsx
└─ broadcast-detail.tsx
```

- `<BroadcastForm audienceSelector={<AudienceSelectorEvent eventId={...} />} />` の props 注入パターン
- zod schema で入力値検証
- sonner でトースト

### Phase 3: ページ差し替え + メニュー rename

1. **グローバル**: `apps/web/app/(dashboard)/mail/` → `apps/web/app/(dashboard)/broadcasts/`
   - 一覧 / 新規作成 / 詳細 を共通コンポーネントで再実装
2. **イベント**: `apps/web/app/(dashboard)/events/[id]/mail/page.tsx` → `apps/web/app/(dashboard)/events/[id]/broadcasts/page.tsx`
   - 一覧 + 作成ダイアログ or 別ページ
3. **ナビ**: `apps/web/lib/event-navigation.ts` の segment `mail` → `broadcasts`、label 「メール配信」→「配信」
4. **グローバルメニュー**: 「メール配信」→ 「配信」
5. **参加者ページ**: 「一括通知」ダイアログを削除、「配信画面で送信」ボタンに置換
6. **リダイレクト**: `next.config.mjs` の `redirects()` で `/mail/*` → `/broadcasts/*` に301
7. **API クライアント**: `apps/web/lib/api/mail.ts` → `apps/web/lib/api/broadcasts.ts`、hooks も `hooks/broadcasts/`

### Phase 4: 将来拡張（別PR）

- Resend SDK 実統合 + BullMQ 送信ジョブ化
- `User.lineUserId` カラム追加 + LINE Messaging API 統合
- 配信テンプレートのチャネル別管理（in_app 用テンプレートも対応）
- 強制送信フラグ（`NotificationPreference` を無視できるフラグ、運用要件が出てきたら）

## 影響範囲

### 破壊的変更

- DB スキーマ rename（既存データは ALTER で保持）
- API エンドポイントパス変更 `/mail/*` → `/broadcasts/*`
- フロント URL 変更（リダイレクトで吸収）
- 既存の「一括通知」ダイアログ削除

### 非破壊

- `POST /events/:id/participants/notify` は互換維持
- `Notification` / `NotificationPreference` テーブルは無変更
- 参加者・イベント関連テーブルは無変更

## テスト観点

- [ ] 旧 `/mail` URL が `/broadcasts` にリダイレクトされる
- [ ] グローバル配信でアプリ内通知が作成される（email/line は未実装のため OFF でも成立）
- [ ] イベント配信でそのイベント参加者のみに通知が飛ぶ
- [ ] `NotificationPreference.inAppEnabled=false` のユーザーには通知が飛ばない
- [ ] admin 以外がグローバル配信を作成しようとすると 403
- [ ] イベント運営者でないユーザーがそのイベントの配信を作成しようとすると 403
- [ ] 旧 `POST /events/:id/participants/notify` が引き続き動く
- [ ] Prisma migrate 後、既存の MailMessage データが Broadcast として参照可能
- [ ] pnpm build / lint / typecheck が通る

## 実装順序

```
Step 1: 計画ドキュメント作成 (本ファイル)
Step 2: Phase 1-a  Prisma rename + migration
Step 3: Phase 1-b  backend directory rename
Step 4: Phase 1-c  BroadcastDispatcher 実装
Step 5: Phase 1-d  resolveRecipients 拡張 + 権限ガード
Step 6: Phase 1-e  互換ラッパ
Step 7: Phase 2    FE 共通コンポーネント
Step 8: Phase 3    ページ差し替え + redirect
Step 9: ビルド・Lint・動作確認
Step 10: PR 作成
```

Phase 4（Resend / LINE 実装）は別ブランチ・別PR。
