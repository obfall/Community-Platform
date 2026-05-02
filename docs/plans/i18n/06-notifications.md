# 11.5-06 通知系テンプレートの多言語化

## ゴール

- 通知テンプレートを多言語化し、受信者の `preferredLocale` で配信する
- in-app / email / LINE 全 dispatcher で同じ locale 解決ロジックを使う
- Resend / LINE Messaging API の本番統合は **Phase 12 で別途実施**（本 Phase は MOCK のままテンプレ多言語化のみ）

## 受信者の言語決定

優先順:

1. `User.preferredLocale`（明示設定がある場合）
2. cookie `NEXT_LOCALE`（バック単独配信時は使えない）
3. `appSettings.i18n.defaultLocale`（フォールバック）

dispatcher は **受信者ごとに locale を解決** → テンプレートをレンダリング → 送信。

## 1. システム由来通知（NotificationTemplate 新設）

「コメントが付いた」「イベント参加完了」などのシステム自動通知用に新設:

```sql
-- 20260503000091_notification_templates/migration.sql
CREATE TABLE notification_templates (
  key              VARCHAR(100) NOT NULL,        -- 'comment.added', 'event.joined' 等
  locale           VARCHAR(10)  NOT NULL REFERENCES locales(code) ON UPDATE CASCADE,
  subject_template TEXT         NOT NULL,
  body_template    TEXT         NOT NULL,
  available_vars   JSONB        NOT NULL DEFAULT '[]'::jsonb,  -- ICU 引数のメタ
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (key, locale)
);
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
```

シードで主要キーを ja / en で登録（`comment.added`, `event.joined`, `project.assigned` 等）。

通知作成時:

```typescript
// 旧: title, body を直接組み立てて Notification 作成
// 新: templateKey + variables を保存し、表示時にレンダリング
await this.prisma.notification.create({
  data: {
    userId,
    type: "comment.added",
    templateKey: "comment.added", // 新規
    templateVars: { commenterName, topicTitle }, // 新規 JSONB
    // 既存 title / body は当面温存（後方互換）
    title: "コメントが付きました",
    body: `${commenterName} があなたの投稿にコメントしました`,
  },
});
```

`Notification` テーブル拡張:

```sql
ALTER TABLE notifications
  ADD COLUMN template_key  VARCHAR(100) NULL,
  ADD COLUMN template_vars JSONB NOT NULL DEFAULT '{}'::jsonb;
```

表示側（フロント）:

- `templateKey` がある場合 → クライアントの next-intl で翻訳・レンダリング
- `templateKey` が NULL（旧データ） → `title` / `body` をそのまま表示

## 2. 管理者一括配信（BroadcastTemplate）

11.5-04 で `broadcast_template_translations` を作成済み。本 Phase では **dispatcher 改修** がメイン:

`apps/api/src/broadcasts/dispatchers/broadcast-dispatcher.ts`（既存）:

```typescript
// 旧: broadcast.subject / bodyHtml / bodyText をそのまま recipient へ
// 新: recipient.preferredLocale で翻訳行を選択

const recipientUsers = await this.prisma.user.findMany({
  where: { id: { in: recipientIds } },
  select: { id: true, preferredLocale: true },
});

const recipientLocaleMap = new Map(
  recipientUsers.map((u) => [u.id, u.preferredLocale ?? defaultLocale]),
);

// Broadcast 自体も _i18n を持たせる（マイグレーション追加）
// または BroadcastTemplate の翻訳行を都度引いて render
```

`Broadcast` テーブルにも翻訳列を追加:

```sql
-- 20260503000092_broadcasts_i18n/migration.sql
ALTER TABLE broadcasts
  ADD COLUMN subject_i18n   JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN body_html_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN body_text_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE broadcasts SET
  subject_i18n   = jsonb_build_object('ja', subject),
  body_html_i18n = jsonb_build_object('ja', body_html),
  body_text_i18n = jsonb_build_object('ja', body_text);
```

dispatcher:

```typescript
import { pickLocalized, type LocalizedText } from "@community-platform/shared";

const notificationItems = recipients.map((r) => {
  const locale = recipientLocaleMap.get(r.userId) ?? defaultLocale;
  return {
    userId: r.userId,
    type: notificationType,
    title: pickLocalized(broadcast.subjectI18n as LocalizedText, locale, defaultLocale),
    body:
      pickLocalized(broadcast.bodyTextI18n as LocalizedText, locale, defaultLocale) ??
      stripHtml(pickLocalized(broadcast.bodyHtmlI18n as LocalizedText, locale, defaultLocale)),
    templateKey: broadcast.templateKey ?? null,
    templateVars: broadcast.templateVars ?? {},
  };
});
```

## 3. 各 dispatcher の改修

### in-app dispatcher (`in-app.dispatcher.ts`)

上記の `recipientLocaleMap` を導入。`Notification` 行に `template_key` / `template_vars` を保存。

### email dispatcher (`email.dispatcher.ts`)

現状 MOCK 実装（console.log）。**本 Phase ではテンプレ多言語化に対応するロジックを書くのみ**:

```typescript
async dispatch(broadcast, recipients, recipientLocaleMap) {
  for (const r of recipients) {
    const locale = recipientLocaleMap.get(r.userId) ?? defaultLocale;
    const subject = pickLocalized(broadcast.subjectI18n, locale);
    const html    = pickLocalized(broadcast.bodyHtmlI18n, locale);
    const text    = pickLocalized(broadcast.bodyTextI18n, locale);

    // Phase 12 で Resend に置き換える
    this.logger.log(`[MOCK Email] to=${r.email} locale=${locale} subject=${subject}`);
  }
}
```

### LINE dispatcher (`line.dispatcher.ts`)

同様に MOCK のまま、テンプレ多言語化のみ対応。

## 4. ICU MessageFormat の評価

ICU 引数（`{name} commented on your post`）は受信者ごとに評価:

```typescript
import { IntlMessageFormat } from "intl-messageformat";

const subject = pickLocalized(template.subjectI18n, locale);
const rendered = new IntlMessageFormat(subject, locale).format(templateVars);
```

ライブラリ追加:

```bash
pnpm add -F api intl-messageformat
```

## 5. admin の Broadcast 作成 UI

`apps/web/app/[locale]/(dashboard)/broadcasts/...` の作成フォームを `<TranslatedField multiline>` で両言語入力:

```tsx
<TranslatedField
  locales={locales}
  value={subjectI18n}
  onChange={(loc, val) => setSubjectI18n({ ...subjectI18n, [loc]: val })}
  required
/>
<TranslatedField
  multiline
  locales={locales}
  value={bodyTextI18n}
  onChange={(loc, val) => setBodyTextI18n({ ...bodyTextI18n, [loc]: val })}
  required
/>
```

## 触るファイル

- 新規マイグレーション: `20260503000091_notification_templates/migration.sql`
- 新規マイグレーション: `20260503000092_broadcasts_i18n/migration.sql`
- 新規マイグレーション: `20260503000093_notifications_template_key/migration.sql`
- 編集: `apps/api/prisma/schema.prisma`
- 編集: `apps/api/src/notifications/notifications.service.ts`（template_key / template_vars 対応）
- 編集: `apps/api/src/broadcasts/broadcasts.service.ts`（preferredLocale select 追加）
- 編集: `apps/api/src/broadcasts/dispatchers/{broadcast,in-app,email,line}-dispatcher.ts`
- 新規: `apps/api/src/notifications/templates/notification-templates.service.ts`
- 編集: `apps/web/app/[locale]/(dashboard)/broadcasts/_components/broadcast-form.tsx`
- 編集: `apps/web/components/notifications/notification-item.tsx`（templateKey の翻訳レンダリング対応）

## 完了条件

- [ ] `notification_templates` テーブルが ja / en シード済み
- [ ] `Notification.template_key` / `template_vars` が保存され、フロントで翻訳レンダリングされる
- [ ] `Broadcast.subject_i18n` 等が JSONB で多言語保存される
- [ ] dispatcher が受信者ごとに preferredLocale を解決して配信する
- [ ] admin の Broadcast 作成フォームが両言語入力に対応
- [ ] 既存テストが green

## 工数

PR 2〜3 / 2〜3 日

## メモ

- **Resend / LINE Messaging API の本番統合は Phase 12 で実施**。本 Phase は MOCK ログのままで OK
- ICU 引数の available_vars メタ情報を将来 admin UI でドロップダウン表示できるよう構造化しておく
- `Notification` の旧 `title` / `body` カラムは 11.5-08 では削除しない（過去通知のレガシー表示維持のため）
