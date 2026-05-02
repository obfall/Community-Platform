# 11.5-03 バック nestjs-i18n 導入と AllExceptionsFilter 統合

## ゴール

- nestjs-i18n を導入してバック側のメッセージを多言語化する
- `AllExceptionsFilter` でリクエストの locale を解決し、エラーメッセージを翻訳する
- `BusinessException` と Zod のメッセージを i18n キーで一元管理する

## 実装内容

### 1. nestjs-i18n 導入

```bash
pnpm add -F api nestjs-i18n
```

`apps/api/src/i18n/i18n.module.ts`:

```typescript
import {
  I18nModule,
  AcceptLanguageResolver,
  CookieResolver,
  HeaderResolver,
  QueryResolver,
} from "nestjs-i18n";
import { join } from "path";

I18nModule.forRoot({
  fallbackLanguage: "ja",
  loaderOptions: {
    path: join(__dirname, "/messages/"),
    watch: process.env.NODE_ENV !== "production",
  },
  resolvers: [
    // 優先順: header > cookie > Accept-Language > default
    { use: HeaderResolver, options: ["x-locale"] },
    new CookieResolver(["NEXT_LOCALE"]),
    AcceptLanguageResolver,
  ],
});
```

`AppModule` に import。

### 2. メッセージファイル

`apps/api/src/i18n/messages/ja/errors.json`:

```json
{
  "validation_failed": "入力内容に誤りがあります",
  "unauthorized": "認証が必要です",
  "forbidden": "この操作は許可されていません",
  "not_found": {
    "default": "対象が見つかりません",
    "user": "ユーザーが見つかりません",
    "topic": "トピックが見つかりません"
  },
  "conflict": {
    "default": "競合が発生しました",
    "duplicate_email": "このメールアドレスは既に登録されています"
  }
}
```

`apps/api/src/i18n/messages/en/errors.json`:

```json
{
  "validation_failed": "Validation failed",
  "unauthorized": "Authentication required",
  "forbidden": "This operation is not allowed",
  "not_found": {
    "default": "Not found",
    "user": "User not found",
    "topic": "Topic not found"
  },
  "conflict": {
    "default": "Conflict occurred",
    "duplicate_email": "This email address is already registered"
  }
}
```

namespace は `errors` / `notifications` / `validation` / `email_templates` の 4 種で開始。

### 3. `BusinessException` の messageKey 対応

既存 `apps/api/src/common/exceptions/business.exception.ts`:

```typescript
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    status: HttpStatus,
    message: string, // 既存
    public readonly details?: Record<string, unknown>,
    public readonly messageKey?: string, // 新規（i18n キー）
    public readonly messageArgs?: Record<string, unknown>, // ICU 引数
  ) {
    super({ message, errorCode, details }, status);
  }
}
```

新規 throw は `messageKey` を渡す:

```typescript
throw new BusinessException(
  ErrorCode.NOT_FOUND,
  HttpStatus.NOT_FOUND,
  "ユーザーが見つかりません", // フォールバック（i18n が未解決の場合用）
  { userId },
  "errors.not_found.user",
);
```

### 4. `AllExceptionsFilter` の改修

`apps/api/src/common/filters/all-exceptions.filter.ts` の `normalize()` で:

1. リクエストから locale を解決（`I18nContext.current()?.lang`）
2. 例外が `BusinessException` で `messageKey` を持つ → `i18n.translate(key, { lang, args })` で解決
3. `messageKey` が無い、または key が見つからない → 既存の `message` を fallback として使う
4. NestJS 標準の `NotFoundException("通知が見つかりません")` などは当面そのまま流す（段階移行で順次キー化）

```typescript
// 簡易疑似コード
const lang = I18nContext.current()?.lang ?? "ja";

let resolvedMessage = exception.message;
if (exception instanceof BusinessException && exception.messageKey) {
  try {
    resolvedMessage = await this.i18n.translate(exception.messageKey, {
      lang,
      args: exception.messageArgs,
    });
  } catch {
    // key が見つからない → fallback message を使用
  }
}
```

### 5. ValidationPipe の i18n 化

`apps/api/src/main.ts` の `exceptionFactory`:

```typescript
// 旧: throw new BusinessException(..., "入力内容に誤りがあります", details);
// 新: messageKey 経由で翻訳
throw new BusinessException(
  ErrorCode.VALIDATION_FAILED,
  HttpStatus.UNPROCESSABLE_ENTITY,
  "入力内容に誤りがあります",
  details,
  "errors.validation_failed",
);
```

class-validator のフィールド別メッセージは別途 `nestjs-i18n` の `i18nValidationMessage()` で多言語化可能。詳細は 11.5-03 着手時に決定。

### 6. フロント Zod の一元化

`apps/web/lib/zod-i18n.ts`:

```typescript
import { z } from "zod/v4";
import { useTranslations } from "next-intl";

// グローバル customError は静的 i18n 関数で（hook は使えない）
z.config({
  customError: (issue) => {
    const t = (key: string) => key; // 暫定
    switch (issue.code) {
      case "invalid_type":
        return t("validation.invalid_type");
      case "too_small":
        return t("validation.too_small");
      // ...
    }
    return undefined;
  },
});
```

実際の翻訳は **コンポーネント側で `useTranslations()` を使って手動マップ**する形が現実的（Zod 4.x の制約）。詳細は 11.5-03 着手時に検討。

既存 43 箇所の日本語直書き（`.email("メール...")` 等）は段階的に削除し `customError` に集約。

## 触るファイル

- 編集: `apps/api/package.json`
- 新規: `apps/api/src/i18n/i18n.module.ts`
- 新規: `apps/api/src/i18n/messages/{ja,en}/{errors,notifications,validation}.json`
- 編集: `apps/api/src/app.module.ts`（I18nModule import）
- 編集: `apps/api/src/common/exceptions/business.exception.ts`（messageKey 追加）
- 編集: `apps/api/src/common/filters/all-exceptions.filter.ts`（i18n 解決）
- 編集: `apps/api/src/main.ts`（ValidationPipe exceptionFactory）
- 新規: `apps/web/lib/zod-i18n.ts`
- 編集: `apps/web/app/[locale]/layout.tsx`（zod-i18n の global config 呼び出し）

## 完了条件

- [ ] バックエンドが `Accept-Language: en` を受け取ると英語エラーを返す
- [ ] `BusinessException(messageKey: "errors.not_found.user")` がリクエスト locale で翻訳される
- [ ] フロントが API の翻訳済みエラーメッセージをそのまま toast 表示する
- [ ] 既存テストが green

## 工数

PR 1 / 1.5 日

## メモ

- API 標準 Exception 267 箇所のキー化は本 Phase では着手しない。AllExceptionsFilter の i18n 対応のみで「fallback で日本語そのまま」が動くようにし、各 feature の修正は **その feature を触る別 PR** で順次対応。完全移行は 11.5-08 で確認
