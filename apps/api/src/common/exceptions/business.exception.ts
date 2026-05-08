import { HttpException } from "@nestjs/common";
import type { ErrorCode } from "@community-platform/shared";

/**
 * フィールド単位のエラー詳細。
 * バリデーションエラー等で「どのフィールドが何で失敗したか」を返したい時に使う。
 */
export interface BusinessExceptionFieldError {
  field: string;
  message: string;
  rule?: string;
}

/**
 * ビジネスロジック上の意図的なエラー。
 *
 * NestJS 標準の HttpException に `code`（フロント側で分岐する定数）と
 * `errors`（フィールド別詳細）を追加した独自例外クラス。
 *
 * `messageKey` を渡すと AllExceptionsFilter が nestjs-i18n でリクエスト locale に翻訳する。
 * 翻訳に失敗した場合は `message` がフォールバックとして使われる（後方互換）。
 *
 * @example
 *   throw new BusinessException(
 *     ErrorCode.USER_EMAIL_ALREADY_EXISTS,
 *     HttpStatus.CONFLICT,
 *     "このメールアドレスは既に登録されています",
 *     undefined,
 *     "errors.conflict.duplicate_email",
 *   );
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    httpStatus: number,
    message: string,
    public readonly errors?: BusinessExceptionFieldError[],
    public readonly messageKey?: string,
    public readonly messageArgs?: Record<string, unknown>,
  ) {
    super({ code, message, errors }, httpStatus);
  }
}
