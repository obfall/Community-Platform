# 11.5-04 マスタ翻訳テーブル化と管理 UI

## ゴール

- 管理者が登録するマスタデータを **両言語必須入力** で運用できるようにする
- 翻訳テーブル分離方式（`{table}_translations`）で全マスタを多言語化する
- 管理 UI に **言語タブ切替型** の入力コンポーネントを導入する

## 対象テーブル（約 25）

| カテゴリ   | テーブル                   | 翻訳対象カラム                                                 |
| ---------- | -------------------------- | -------------------------------------------------------------- |
| 分類系     | `categories`               | name, description                                              |
| 分類系     | `tags`                     | name                                                           |
| 分類系     | `board_categories`         | name, description                                              |
| 分類系     | `event_board_categories`   | name                                                           |
| 分類系     | `project_board_categories` | name                                                           |
| 分類系     | `memo_category`            | name                                                           |
| 分類系     | `video_series`             | name, description                                              |
| 分類系     | `product_series`           | name                                                           |
| 会員       | `member_ranks`             | name                                                           |
| 会員       | `member_attributes`        | name + options 内ラベル                                        |
| 設定       | `feature_settings`         | description                                                    |
| 設定       | `app_settings`             | description                                                    |
| 設定       | `shop_settings`            | （該当テキストカラムを精査）                                   |
| コンテンツ | `faq_articles`             | title, body, category                                          |
| コンテンツ | `orientation_pages`        | title, body                                                    |
| 通知       | `broadcast_templates`      | name, subject_template, body_html_template, body_text_template |
| ポイント   | `point_rules`              | name                                                           |
| その他     | `banned_words`             | replacement                                                    |

## 翻訳テーブル命名規則

| 項目         | 規則                                                       |
| ------------ | ---------------------------------------------------------- |
| テーブル名   | `{base_table}_translations`                                |
| 主キー       | `({base_id}, locale)` の複合キー                           |
| 外部キー     | `{base_id}` ON DELETE CASCADE / `locale` ON UPDATE CASCADE |
| インデックス | `idx_{table}_translations_locale`                          |
| 監査列       | `created_at`, `updated_at` 必須                            |
| RLS          | `ENABLE ROW LEVEL SECURITY` 必須                           |

## 標準マイグレーションテンプレート

例: `categories` の場合

```sql
-- 20260503000010_categories_translations/migration.sql
CREATE TABLE category_translations (
  category_id  UUID         NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  locale       VARCHAR(10)  NOT NULL REFERENCES locales(code)  ON UPDATE CASCADE,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, locale)
);

CREATE INDEX idx_category_translations_locale ON category_translations(locale);
ALTER TABLE category_translations ENABLE ROW LEVEL SECURITY;

-- 既存データを ja として backfill
INSERT INTO category_translations (category_id, locale, name, description)
SELECT id, 'ja', name, description FROM categories;

-- 既存 categories.name / description は当面温存（11.5-08 で DROP）
```

Prisma:

```prisma
model Category {
  id           String   @id ...
  // 既存カラムは当面温存（互換のため）
  name         String   @db.VarChar(100)
  description  String?  @db.Text

  translations CategoryTranslation[]
}

model CategoryTranslation {
  categoryId  String   @map("category_id") @db.Uuid
  locale      String   @db.VarChar(10)
  name        String   @db.VarChar(100)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @updatedAt      @map("updated_at") @db.Timestamptz()

  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  localeRef   Locale   @relation(fields: [locale],     references: [code])

  @@id([categoryId, locale])
  @@index([locale])
  @@map("category_translations")
}
```

## Service 層の共通ヘルパー

`apps/api/src/common/utils/i18n-resolver.ts`（新規）:

```typescript
import { I18nContext } from "nestjs-i18n";

export function getCurrentLocale(fallback: string = "ja"): string {
  return I18nContext.current()?.lang ?? fallback;
}

/**
 * 翻訳行配列から指定 locale の値を取り出す。fallback chain 適用。
 */
export function pickTranslation<T extends { locale: string }>(
  translations: T[],
  locale: string,
  fallbackLocale: string = "ja",
): T | undefined {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === fallbackLocale) ??
    translations[0]
  );
}
```

各 service で:

```typescript
async findMany() {
  const locale = getCurrentLocale();
  const rows = await this.prisma.category.findMany({
    include: { translations: { where: { locale: { in: [locale, "ja"] } } } },
  });
  return rows.map((r) => {
    const t = pickTranslation(r.translations, locale);
    return { id: r.id, name: t?.name ?? r.name, description: t?.description ?? r.description };
  });
}
```

## 管理 UI の言語タブコンポーネント

`apps/web/components/i18n/translated-field.tsx`（新規）:

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locales: { code: string; nameNative: string }[];
  value: Record<string, string>;
  onChange: (locale: string, value: string) => void;
  multiline?: boolean;
  placeholder?: Record<string, string>;
  required?: boolean;
};

export function TranslatedField({
  locales,
  value,
  onChange,
  multiline,
  placeholder,
  required,
}: Props) {
  const [active, setActive] = useState(locales[0]?.code ?? "ja");
  const Field = multiline ? Textarea : Input;

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList>
        {locales.map((l) => {
          const filled = !!value[l.code]?.trim();
          return (
            <TabsTrigger key={l.code} value={l.code}>
              {l.nameNative}
              {required && !filled && <span className="text-destructive ml-1">*</span>}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {locales.map((l) => (
        <TabsContent key={l.code} value={l.code}>
          <Field
            value={value[l.code] ?? ""}
            onChange={(e) => onChange(l.code, e.target.value)}
            placeholder={placeholder?.[l.code]}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

各マスタの管理ページ（`apps/web/app/[locale]/(dashboard)/system-admin/categories/...` 等）でこのコンポーネントを使い、`useLocales()` hook で `locales` 一覧を取得する。

## バリデーション

「全アクティブ locale で必須」を Zod スキーマで:

```typescript
function makeRequiredLocalizedSchema(locales: string[]) {
  return z.record(z.string()).refine((v) => locales.every((l) => v[l]?.trim().length > 0), {
    message: "validation.all_locales_required",
  });
}
```

## PR の分割案（推奨順序）

| PR  | 対象テーブル                                                                      | 理由                                                      |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | tags                                                                              | 最小規模で雛形を確立                                      |
| 2   | member_ranks, point_rules                                                         | 単純な name のみ                                          |
| 3   | categories                                                                        | 多くの feature が依存、雛形を踏襲                         |
| 4   | board_categories, event_board_categories, project_board_categories, memo_category | 似た構造を一括                                            |
| 5   | video_series, product_series                                                      | 同上                                                      |
| 6   | member_attributes（options 含む）                                                 | options の `Array<{ value, labels: LocalizedText }>` 移行 |
| 7   | broadcast_templates                                                               | 通知系の準備（11.5-06 の前提）                            |
| 8   | faq_articles                                                                      | テキスト量大、別 PR                                       |
| 9   | orientation_pages                                                                 | 同上                                                      |
| 10  | feature_settings, app_settings, shop_settings                                     | 設定系まとめて                                            |
| 11  | banned_words の replacement                                                       | 細かい調整                                                |

## 触るファイル（PR ごとに局所的）

- 各マイグレーション: `apps/api/prisma/migrations/202605030000XX_{table}_translations/migration.sql`
- 編集: `apps/api/prisma/schema.prisma`（Translation モデル追加）
- 編集: `apps/api/src/{feature}/{feature}.service.ts`（findMany / create / update に翻訳対応）
- 編集: `apps/api/src/{feature}/dto/`（DTO に `nameTranslations: Record<string, string>` 追加）
- 編集: `apps/web/app/[locale]/(dashboard)/system-admin/{feature}/_components/`（admin form に TranslatedField）
- 新規: `apps/web/hooks/i18n/use-locales.ts`
- 新規: `apps/web/components/i18n/translated-field.tsx`

## 完了条件（PR ごと）

- [ ] 該当マスタの翻訳テーブルが作成・backfill 済み
- [ ] admin が ja / en 両方で入力できる
- [ ] 一般画面でリクエスト locale の値が返る（fallback chain 含む）
- [ ] 既存テストが green
- [ ] seed.ts に en 値が（暫定 ja コピーでも）入っている

## 工数

PR 8〜12 / 5〜7 日（並列化可能）

## メモ

- 初期 en データは **暫定 ja コピー** で OK。後日 admin が UI で穴埋め前提。NOT NULL バリデは管理 UI 側のみ強制し、DB は NULL 許容開始 → 全件埋まったら NOT NULL に変更
- `member_attributes.options` は `string[]` から `Array<{ value: string; labels: Record<string, string> }>` への JSON 構造変更が必要。マイグレーションで既存値を `[{ value: v, labels: { ja: v } }]` に変換
- `BroadcastTemplate` は 11.5-06 と密接、本 Phase では翻訳テーブル化のみ。dispatcher 改修は 11.5-06 で
