# 01: バックエンド例外フィルタ強化

## 目的

現状の `all-exceptions.filter.ts` を起点に、以下を整備する:

- クライアントが扱いやすい **`code` フィールド付き統一レスポンス**
- **Prisma エラー**（unique 制約違反・レコード不在など）の適切な HTTP ステータス変換
- **ビジネス例外クラス** による意図的なエラー表現
- **ValidationPipe** のエラーを他と同じフォーマットに揃える

## 現状調査

- `apps/api/src/common/filters/all-exceptions.filter.ts`: HTTP 例外を拾って `{statusCode, message, timestamp, path}` を返す
- `apps/api/src/app.module.ts`: `APP_FILTER` で `SentryGlobalFilter` を使用。全例外が Sentry に送られる前提
- `apps/api/src/main.ts`: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` 設定済み
- Prisma エラー個別ハンドルなし / カスタム例外クラスなし

## 目標レスポンス形式

```json
{
  "statusCode": 409,
  "code": "USER_EMAIL_ALREADY_EXISTS",
  "message": "このメールアドレスは既に登録されています",
  "errors": [{ "field": "email", "message": "must be unique" }],
  "timestamp": "2026-04-25T10:00:00.000Z",
  "path": "/api/users",
  "requestId": "req_abc123"
}
```

- `code`: クライアント側で分岐するための定数（大文字スネークケース）
- `errors`: バリデーションエラーなど、フィールド別の詳細が必要な時だけ付与
- `requestId`: 02-backend-structured-logging で導入する traceId と同じ値

## 実装ステップ

### ステップ1: エラーコード定数を定義

`apps/api/src/common/errors/error-codes.ts` を新設:

```ts
export const ErrorCode = {
  // 共通
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  // ドメイン固有
  USER_EMAIL_ALREADY_EXISTS: "USER_EMAIL_ALREADY_EXISTS",
  EVENT_CAPACITY_EXCEEDED: "EVENT_CAPACITY_EXCEEDED",
  POINT_INSUFFICIENT_BALANCE: "POINT_INSUFFICIENT_BALANCE",
  // ...
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
```

各ドメインで必要になったら追加していく。

**配置先**: `packages/shared/src/constants/error-codes.ts`（フロント/バック共有、2026-04-25 確定）。フロント側は `import { ErrorCode } from "@community-platform/shared"` で型付き比較可能。

### ステップ2: カスタム例外クラス

`apps/api/src/common/exceptions/business.exception.ts` を新設:

```ts
export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCodeType,
    public readonly httpStatus: number,
    message: string,
    public readonly errors?: Array<{ field: string; message: string }>,
  ) {
    super({ code, message, errors }, httpStatus);
  }
}

// 使用例
throw new BusinessException(
  ErrorCode.USER_EMAIL_ALREADY_EXISTS,
  409,
  "このメールアドレスは既に登録されています",
);
```

各サービスで例外を投げる時はこれを使う（既存の `throw new ConflictException(...)` も移行）。

### ステップ3: Prisma エラーマッピング

`all-exceptions.filter.ts` に以下の分岐を追加:

```ts
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

if (exception instanceof PrismaClientKnownRequestError) {
  switch (exception.code) {
    case "P2002": // unique constraint
      return { statusCode: 409, code: "CONFLICT", message: "既に登録されています", errors: [...] };
    case "P2025": // record not found
      return { statusCode: 404, code: "NOT_FOUND", message: "対象が見つかりません" };
    case "P2003": // foreign key
      return { statusCode: 400, code: "VALIDATION_FAILED", message: "参照先が存在しません" };
    // ...
  }
}
```

### ステップ4: ValidationPipe のエラー形式統一

`main.ts` の ValidationPipe に `exceptionFactory` を追加:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => {
    const errorDetails = errors.flatMap((e) =>
      Object.entries(e.constraints ?? {}).map(([rule, msg]) => ({
        field: e.property,
        rule,
        message: msg,
      })),
    );
    return new BusinessException(
      ErrorCode.VALIDATION_FAILED,
      400,
      "入力内容に誤りがあります",
      errorDetails,
    );
  },
});
```

これで ValidationPipe 起因のエラーも統一フォーマットになる。

### ステップ5: フィルタ全体の整理

`all-exceptions.filter.ts` をリライトし、以下の優先順で処理:

1. `BusinessException`: そのまま使う（code / errors / httpStatus を取り出す）
2. `HttpException`: `statusCode` と `message` を取り出し、`code` はステータスから推論
3. `PrismaClientKnownRequestError`: Prisma マッピングで変換
4. それ以外の Error: `500` + `INTERNAL_ERROR` + スタックトレース非露出

`SentryGlobalFilter` は残しつつ、**自前フィルタを先**に登録する順序を確認（`main.ts` で `app.useGlobalFilters(...)`）。

### ステップ6: 既存コードの段階移行

- `throw new ConflictException(...)` → `throw new BusinessException(ErrorCode.CONFLICT, 409, "...")`
- `throw new NotFoundException(...)` → `throw new BusinessException(ErrorCode.NOT_FOUND, 404, "...")`
- 全モジュール機械的に置換できるわけではないので、**新規コードから適用**し、既存は都度修正

## テスト方針

- `all-exceptions.filter.spec.ts` に以下のケースを追加:
  - BusinessException が正しいレスポンスになる
  - Prisma P2002 が 409 + `CONFLICT` になる
  - Prisma P2025 が 404 + `NOT_FOUND` になる
  - 未ハンドル Error が 500 + `INTERNAL_ERROR` + スタック隠蔽になる
  - ValidationPipe エラーが `VALIDATION_FAILED` + `errors[]` を返す

## 確定事項

- ✅ エラーコードは `packages/shared/src/constants/error-codes.ts` に置いて型共有

## 残確認事項

- [ ] 既存 `throw new ConflictException(...)` 箇所を全移行するか、新規のみ適用するか
- [ ] Prisma マッピングの対象コード（P2002/P2025/P2003 以外に扱うべきものあるか）
- [ ] レスポンスに `requestId` を含める（02 の traceId と統合）方針で OK か

## 成果物

- `apps/api/src/common/errors/error-codes.ts`
- `apps/api/src/common/exceptions/business.exception.ts`
- `apps/api/src/common/filters/all-exceptions.filter.ts`（リライト）
- `apps/api/src/main.ts`（ValidationPipe exceptionFactory 追加）
- `apps/api/src/common/filters/all-exceptions.filter.spec.ts`（テスト追加）
