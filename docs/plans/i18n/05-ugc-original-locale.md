# 11.5-05 UGC に originalLocale 追加

## ゴール

- UGC（投稿・コメント・商品名等）に **`original_locale` カラム** を追加する
- 投稿フォームに **言語セレクタ** を追加し、投稿時の言語を保存する
- 翻訳機能は実装しないため、他言語ユーザーは原文をそのまま読む（表示時の UI 補助のみ）

## スコープ外（本 Phase で**やらない**）

- 機械翻訳・翻訳ボタン・DeepL 等のプロバイダ統合 → 計画から除外済み
- UGC 本文の JSONB 化 → 不要（単純 text + originalLocale で完結）
- pgroonga インデックスの再構築 → 不要（カラム追加のみで既存 index に影響なし）

## 対象テーブル（約 20）

| テーブル                                        | originalLocale を持つべき理由 |
| ----------------------------------------------- | ----------------------------- |
| `board_topics`                                  | タイトル + 本文               |
| `board_topic_posts`                             | 本文                          |
| `board_topic_post_comments`                     | 本文                          |
| `event_board_topics` / `_posts` / `_comments`   | 同上                          |
| `project_board_topics` / `_posts` / `_comments` | 同上                          |
| `events`                                        | title, description 等         |
| `event_application_questions`                   | label, description            |
| `projects`                                      | name, description             |
| `project_threads` / `_replies`                  | title, body                   |
| `videos`                                        | title, description            |
| `albums`                                        | title, description            |
| `album_photos`                                  | title, caption                |
| `products`                                      | name, description             |
| `skill_listings`                                | title, description            |
| `skill_comments`                                | body                          |
| `skill_messages`                                | body                          |
| `surveys`                                       | title, description            |
| `survey_questions`                              | question_text                 |
| `contents`                                      | name, description             |
| `venues`                                        | name, address, description    |
| `spaces`                                        | name, description             |

**スコープ外**（本人専用 UGC・翻訳不要）:

- `memos` / `user_library_items` / `chat_messages` / `reservations.note` / 非公開 `schedules`
  - これらは **`original_locale` カラムも追加しない**（投稿者の言語で読み返すだけなので不要）

**個別検討**:

- `chat_messages` — リアルタイム性高、追加コスト見合い悪い → 追加しない
- `user_public_info` / `user_profiles` / `user_affiliations` — マスタ的だが実体は UGC（本人編集） → originalLocale 追加（多言語入力 UI も提供）

## 標準マイグレーションテンプレート

例: `board_topics`

```sql
-- 20260503000020_board_topics_original_locale/migration.sql
ALTER TABLE board_topics
  ADD COLUMN original_locale VARCHAR(10) NOT NULL DEFAULT 'ja'
    REFERENCES locales(code) ON UPDATE CASCADE;

CREATE INDEX idx_board_topics_original_locale ON board_topics(original_locale);
```

Prisma:

```prisma
model BoardTopic {
  // ...既存
  originalLocale String   @default("ja") @map("original_locale") @db.VarChar(10)
  localeRef      Locale   @relation(fields: [originalLocale], references: [code])

  @@index([originalLocale])
}
```

**既存データ**: `DEFAULT 'ja'` で全件 ja 扱い。改めて backfill SQL は不要（`Event.language` のような明示的な言語が別カラムにあれば、それを参照して backfill する個別対応も可）。

## 投稿フォームの言語セレクタ

`apps/web/components/i18n/locale-selector.tsx`（新規、既存 `useLocales()` hook を使う）:

```tsx
"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useLocales } from "@/hooks/i18n/use-locales";

type Props = {
  value: string;
  onChange: (locale: string) => void;
  label?: string;
};

export function LocaleSelector({ value, onChange, label }: Props) {
  const { data: locales } = useLocales();

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales?.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.nameNative}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

各投稿フォームでデフォルト値は **現在の UI locale**:

```tsx
const currentLocale = useLocale(); // next-intl
const [originalLocale, setOriginalLocale] = useState(currentLocale);
// ...
<LocaleSelector value={originalLocale} onChange={setOriginalLocale} label="投稿言語" />;
```

## 表示時の言語不一致表示

UGC の `originalLocale` が現在の UI locale と異なる場合、**原文ラベル** を付ける:

`apps/web/components/i18n/original-locale-badge.tsx`（新規）:

```tsx
"use client";

import { useTranslations, useLocale } from "next-intl";

type Props = {
  originalLocale: string;
};

export function OriginalLocaleBadge({ originalLocale }: Props) {
  const currentLocale = useLocale();
  const t = useTranslations("common");

  if (originalLocale === currentLocale) return null;

  return (
    <span className="inline-flex items-center text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
      {t("originalLanguage", { locale: originalLocale.toUpperCase() })}
    </span>
  );
}
```

各 UGC 詳細・カードに `<OriginalLocaleBadge originalLocale={topic.originalLocale} />` を追加。

## API DTO

create / update DTO に `originalLocale` を optional で追加（未指定なら request locale を使う）:

```typescript
export class CreateBoardTopicDto {
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsString() originalLocale?: string; // 未指定時は service 側で I18nContext から決定
}
```

service:

```typescript
async create(dto: CreateBoardTopicDto, userId: string) {
  const originalLocale = dto.originalLocale ?? getCurrentLocale();
  return this.prisma.boardTopic.create({
    data: { ...dto, originalLocale, authorId: userId },
  });
}
```

## PR の分割案

| PR  | 対象                                                                                       |
| --- | ------------------------------------------------------------------------------------------ |
| 1   | board_topics + board_topic_posts + board_topic_post_comments                               |
| 2   | event*board*_ + project*board*_                                                            |
| 3   | events + event_application_questions                                                       |
| 4   | projects + project_threads + project_thread_replies                                        |
| 5   | videos + albums + album_photos + contents                                                  |
| 6   | products + skill_listings + skill_comments + skill_messages                                |
| 7   | surveys + survey_questions                                                                 |
| 8   | venues + spaces                                                                            |
| 9   | user_public_info + user_profiles + user_affiliations + LocaleSelector の自プロフィール対応 |

PR 4〜5 程度にまとめても良い。

## 触るファイル

- 各マイグレーション: `apps/api/prisma/migrations/202605030000XX_{table}_original_locale/migration.sql`
- 編集: `apps/api/prisma/schema.prisma`
- 編集: 各 `apps/api/src/{feature}/{feature}.service.ts`（create / update で originalLocale セット）
- 編集: 各 `apps/api/src/{feature}/dto/`（originalLocale optional 追加）
- 編集: 各投稿/編集フォーム（`apps/web/app/[locale]/(dashboard)/{feature}/...`）に LocaleSelector 追加
- 編集: 各 UGC 表示箇所に OriginalLocaleBadge 追加
- 新規: `apps/web/components/i18n/{locale-selector,original-locale-badge}.tsx`

## 完了条件

- [ ] 全対象テーブルに `original_locale` が追加され既存データは `ja`
- [ ] 投稿フォームに LocaleSelector があり保存時に originalLocale が DB に入る
- [ ] 一覧・詳細で原文と UI locale が異なる UGC に Badge が表示される
- [ ] 既存テストが green

## 工数

PR 3〜5 / 2〜3 日

## メモ

- **Phase 11.1（pgroonga）が完了していなくても本 Phase は着手可能**（`original_locale` 追加は既存 pgroonga インデックスに影響しない）
- 検索結果に originalLocale を含めるかは検索 API 側で判断
- 将来翻訳機能を追加する場合は `{table}_translations` を別途新設する設計（既存 `original_locale` カラムはそのまま使える）
