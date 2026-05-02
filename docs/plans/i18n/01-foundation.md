# 11.5-01 基盤（locales テーブル / User.preferredLocale / shared 型）

## ゴール

- フロント・バック共通の **ロケール定義** とその参照基盤を整える
- ユーザーごとの UI 言語設定を保存できるようにする
- 共通型（`Locale`, `LocalizedText`）を `packages/shared` に配置する

## 実装内容

### 1. shared 型の追加

`packages/shared/src/i18n/` を新設:

```typescript
// packages/shared/src/i18n/locale.ts
export type Locale = string; // ランタイムは locales テーブルで管理

export const DEFAULT_LOCALE: Locale = "ja";
export const FALLBACK_LOCALE: Locale = "ja";

// 初期サポート言語（locales テーブルのシードと一致させる）
export const INITIAL_SUPPORTED_LOCALES: readonly Locale[] = ["ja", "en"] as const;
```

```typescript
// packages/shared/src/i18n/types.ts
import { z } from "zod";

export const localeCodeSchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[a-z]{2}(-[A-Z][a-zA-Z]{1,8})?$/);

export const localizedTextSchema = z.record(localeCodeSchema, z.string());
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export interface LocaleAware<T> {
  data: T;
  locale: Locale;
  fallbackUsed: boolean;
}
```

```typescript
// packages/shared/src/i18n/helpers.ts
export function pickLocalized(
  value: LocalizedText,
  locale: Locale,
  fallback: Locale = FALLBACK_LOCALE,
): string {
  return value[locale] ?? value[fallback] ?? Object.values(value)[0] ?? "";
}
```

### 2. `locales` テーブル新設

マイグレーション: `20260503000001_create_locales`

```sql
CREATE TABLE locales (
  code         VARCHAR(10) PRIMARY KEY,
  name_native  VARCHAR(100) NOT NULL,
  name_en      VARCHAR(100) NOT NULL,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  is_enabled   BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_locales_default ON locales(is_default) WHERE is_default;
ALTER TABLE locales ENABLE ROW LEVEL SECURITY;

INSERT INTO locales(code, name_native, name_en, is_default, sort_order) VALUES
  ('ja', '日本語', 'Japanese', true,  0),
  ('en', 'English', 'English', false, 1);
```

Prisma:

```prisma
model Locale {
  code        String   @id @db.VarChar(10)
  nameNative  String   @map("name_native") @db.VarChar(100)
  nameEn      String   @map("name_en") @db.VarChar(100)
  isDefault   Boolean  @default(false) @map("is_default")
  isEnabled   Boolean  @default(true)  @map("is_enabled")
  sortOrder   Int      @default(0)     @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @updatedAt      @map("updated_at") @db.Timestamptz()

  @@map("locales")
}
```

### 3. `User.preferredLocale` 追加

マイグレーション: `20260503000002_user_preferred_locale`

```sql
ALTER TABLE users
  ADD COLUMN preferred_locale VARCHAR(10) NULL
    REFERENCES locales(code) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX idx_users_preferred_locale ON users(preferred_locale);
```

Prisma User モデルに追加:

```prisma
model User {
  // ...既存フィールド
  preferredLocale String? @map("preferred_locale") @db.VarChar(10)
  // 既存の UserLanguage（話せる言語プロファイル）とは独立
}
```

**既存の `Event.language` カラムは触らない**（イベント運営言語のメタ情報として残す）。

### 4. `appSettings` に i18n キー追加

シード追加（`apps/api/prisma/seed.ts`）:

```typescript
{ key: "i18n.defaultLocale",  value: "ja" },
{ key: "i18n.fallbackLocale", value: "ja" },
{ key: "i18n.enabledLocales", value: '["ja","en"]' }, // JSON 配列
```

### 5. Locale 管理 API（新設）

`apps/api/src/i18n/locales/`:

- `locales.controller.ts` — `GET /api/i18n/locales`（公開）、`POST/PATCH/DELETE`（admin only）
- `locales.service.ts`
- `locales.module.ts`

レスポンス例:

```json
[
  { "code": "ja", "nameNative": "日本語", "isDefault": true, "isEnabled": true },
  { "code": "en", "nameNative": "English", "isDefault": false, "isEnabled": true }
]
```

### 6. `getMe` レスポンスに `preferredLocale` を含める

`apps/api/src/auth/auth.service.ts` の `getMe` で `preferredLocale` を select に追加。

`apps/web/lib/api/types.ts` の `AuthUser` に `preferredLocale: string | null` を追加。

## 触るファイル

- 新規: `packages/shared/src/i18n/{locale,types,helpers}.ts`
- 新規: `packages/shared/src/i18n/index.ts`
- 編集: `packages/shared/src/index.ts`（export 追加）
- 新規: `apps/api/prisma/migrations/20260503000001_create_locales/migration.sql`
- 新規: `apps/api/prisma/migrations/20260503000002_user_preferred_locale/migration.sql`
- 編集: `apps/api/prisma/schema.prisma`（`Locale` モデル追加、`User.preferredLocale` 追加）
- 編集: `apps/api/prisma/seed.ts` / `seed.demo.ts`（locales / appSettings シード）
- 新規: `apps/api/src/i18n/locales/{controller,service,module}.ts`
- 編集: `apps/api/src/app.module.ts`（LocalesModule import）
- 編集: `apps/api/src/auth/auth.service.ts`（getMe に preferredLocale）
- 編集: `apps/web/lib/api/types.ts`（AuthUser）

## 完了条件

- [ ] `locales` テーブルが ja / en シード済みで作成されている
- [ ] `User.preferredLocale` カラムが追加されている（NULL 許容）
- [ ] `GET /api/i18n/locales` が動作する
- [ ] `getMe` レスポンスに `preferredLocale` が含まれる
- [ ] `packages/shared` から `Locale`, `LocalizedText`, `pickLocalized` が import できる
- [ ] 既存テストが green

## 工数

PR 1〜2 / 1.5 日
