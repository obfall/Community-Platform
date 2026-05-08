import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ErrorCode } from "@community-platform/shared";
import { PinoLogger } from "nestjs-pino";
import * as Sentry from "@sentry/nestjs";
import { I18nContext, I18nService } from "nestjs-i18n";
import type { Request, Response } from "express";
import { BusinessException, BusinessExceptionFieldError } from "../exceptions";

interface NormalizedError {
  statusCode: number;
  code: ErrorCode;
  message: string;
  errors?: BusinessExceptionFieldError[];
}

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ErrorCode.UNSUPPORTED_MEDIA_TYPE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly i18n: I18nService,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const normalized = this.normalize(exception);
    // messageKey 付きの BusinessException はリクエスト locale で翻訳する。
    // 翻訳失敗時は normalized.message（既存の日本語フォールバック）をそのまま使う。
    if (exception instanceof BusinessException && exception.messageKey) {
      // I18nContext.current は AsyncLocalStorage を参照する。テスト等で context が
      // 無い場合は throw するので try で囲み、その時は ja フォールバック。
      let lang = "ja";
      try {
        lang = I18nContext.current()?.lang ?? "ja";
      } catch {
        /* no i18n context — fallback locale */
      }
      try {
        const translated = this.i18n.translate(exception.messageKey, {
          lang,
          args: exception.messageArgs,
        });
        if (typeof translated === "string") normalized.message = translated;
      } catch {
        /* key 未定義など → fallback message のまま */
      }
    }

    const requestId =
      (req.id as string | undefined) ?? (res.getHeader("x-request-id") as string | undefined);
    const timestamp = new Date().toISOString();

    this.log(exception, normalized, req, requestId);
    this.reportToSentry(exception, normalized, requestId);

    res.status(normalized.statusCode).json({
      statusCode: normalized.statusCode,
      code: normalized.code,
      message: normalized.message,
      errors: normalized.errors,
      timestamp,
      path: req.url,
      requestId,
    });
  }

  /**
   * 例外の型を見て、レスポンス用の統一形式に正規化する。
   * 優先順: BusinessException → HttpException → Prisma → 未知 Error。
   */
  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof BusinessException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: this.extractMessage(exception) ?? "エラーが発生しました",
        errors: exception.errors,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return {
        statusCode,
        code: this.codeFromStatus(statusCode),
        message: this.extractMessage(exception) ?? "エラーが発生しました",
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: "Internal server error",
    };
  }

  /**
   * Prisma の主要エラーコードを HTTP / ErrorCode にマッピング。
   * P2002: unique 制約違反 → 409
   * P2025: レコード不在 → 404
   * P2003: 外部キー制約違反 → 400
   * その他: 500
   */
  private fromPrisma(exception: Prisma.PrismaClientKnownRequestError): NormalizedError {
    switch (exception.code) {
      case "P2002": {
        const target = exception.meta?.target;
        const fields = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ErrorCode.CONFLICT,
          message: "既に登録されています",
          errors: fields.map((field) => ({ field, message: "must be unique" })),
        };
      }
      case "P2025":
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: ErrorCode.NOT_FOUND,
          message: "対象が見つかりません",
        };
      case "P2003":
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ErrorCode.VALIDATION_FAILED,
          message: "参照先が存在しません",
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_ERROR,
          message: "Internal server error",
        };
    }
  }

  /**
   * NestJS 標準 HttpException から ErrorCode を推論。
   */
  private codeFromStatus(statusCode: number): ErrorCode {
    const mapped = STATUS_TO_CODE[statusCode];
    if (mapped) return mapped;
    return statusCode >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.VALIDATION_FAILED;
  }

  private extractMessage(exception: HttpException): string | undefined {
    const response = exception.getResponse();
    if (typeof response === "string") return response;
    if (response && typeof response === "object") {
      const message = (response as { message?: unknown }).message;
      if (typeof message === "string") return message;
      if (Array.isArray(message)) return message.join(", ");
    }
    return exception.message;
  }

  /**
   * ステータスコードに応じて適切なログレベルで出力。
   * 5xx: error / 401: info（認証切れノイズ回避）/ それ以外 4xx: warn
   */
  private log(
    exception: unknown,
    normalized: NormalizedError,
    req: Request,
    requestId: string | undefined,
  ) {
    const ctx = {
      requestId,
      code: normalized.code,
      method: req.method,
      url: req.url,
    };

    if (normalized.statusCode >= 500) {
      this.logger.error(
        { ...ctx, err: exception instanceof Error ? exception : undefined },
        normalized.message,
      );
      return;
    }
    if (normalized.statusCode === (HttpStatus.UNAUTHORIZED as number)) {
      this.logger.info(ctx, normalized.message);
      return;
    }
    if (normalized.statusCode >= 400) {
      this.logger.warn(ctx, normalized.message);
    }
  }

  /**
   * Sentry へ送信。5xx と 403 のみ送る（4xx の大半・401 はノイズ回避で送らない）。
   * 詳細な beforeSend フィルタは層4 で整備する想定。
   */
  private reportToSentry(
    exception: unknown,
    normalized: NormalizedError,
    requestId: string | undefined,
  ) {
    const shouldReport =
      normalized.statusCode >= 500 || normalized.statusCode === (HttpStatus.FORBIDDEN as number);
    if (!shouldReport) return;

    Sentry.withScope((scope) => {
      if (requestId) scope.setTag("requestId", requestId);
      scope.setTag("errorCode", normalized.code);
      scope.setLevel(normalized.statusCode >= 500 ? "error" : "warning");
      Sentry.captureException(exception);
    });
  }
}
