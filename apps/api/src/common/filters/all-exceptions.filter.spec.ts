import {
  HttpStatus,
  HttpException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ErrorCode } from "@community-platform/shared";
import * as Sentry from "@sentry/nestjs";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { BusinessException } from "../exceptions";

jest.mock("@sentry/nestjs", () => ({
  withScope: jest.fn((cb: (scope: unknown) => void) =>
    cb({ setTag: jest.fn(), setLevel: jest.fn() }),
  ),
  captureException: jest.fn(),
}));

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let pinoLogger: { setContext: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock };
  let response: { status: jest.Mock; json: jest.Mock; getHeader: jest.Mock };
  let request: { url: string; method: string; id?: string };
  let i18nMock: { translate: jest.Mock };

  const buildHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    pinoLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    // I18nService は messageKey 解決にだけ使われる。messageKey 無しの BusinessException
    // や HttpException ではそもそも呼ばれないため、最小限のモックで十分。
    i18nMock = { translate: jest.fn((key: string) => key) };
    filter = new AllExceptionsFilter(pinoLogger as never, i18nMock as never);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const getHeader = jest.fn().mockReturnValue(undefined);
    response = { status, json, getHeader };
    request = { url: "/api/users", method: "POST", id: "req-test-1" };
  });

  it("BusinessException は code / errors / message をそのままレスポンスに含める", () => {
    const exception = new BusinessException(
      ErrorCode.USER_EMAIL_ALREADY_EXISTS,
      HttpStatus.CONFLICT,
      "メール重複",
      [{ field: "email", message: "must be unique" }],
    );

    filter.catch(exception, buildHost());

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        code: ErrorCode.USER_EMAIL_ALREADY_EXISTS,
        message: "メール重複",
        errors: [{ field: "email", message: "must be unique" }],
        path: "/api/users",
        requestId: "req-test-1",
      }),
    );
    expect(pinoLogger.warn).toHaveBeenCalled();
  });

  it("NestJS 標準 HttpException はステータスコードから code を推論する", () => {
    const exception = new ConflictException("競合");

    filter.catch(exception, buildHost());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
      }),
    );
  });

  it("Prisma P2002（unique 制約違反）を 409 CONFLICT + フィールド詳細にマップする", () => {
    const exception = new Prisma.PrismaClientKnownRequestError("unique violation", {
      code: "P2002",
      clientVersion: "x",
      meta: { target: ["email"] },
    });

    filter.catch(exception, buildHost());

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        errors: [{ field: "email", message: "must be unique" }],
      }),
    );
  });

  it("Prisma P2025（レコード不在）を 404 NOT_FOUND にマップする", () => {
    const exception = new Prisma.PrismaClientKnownRequestError("not found", {
      code: "P2025",
      clientVersion: "x",
    });

    filter.catch(exception, buildHost());

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        code: ErrorCode.NOT_FOUND,
      }),
    );
  });

  it("Prisma P2003（外部キー制約違反）を 400 VALIDATION_FAILED にマップする", () => {
    const exception = new Prisma.PrismaClientKnownRequestError("fk fail", {
      code: "P2003",
      clientVersion: "x",
    });

    filter.catch(exception, buildHost());

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_FAILED,
      }),
    );
  });

  it("未知の Error は 500 INTERNAL_ERROR を返し Sentry にも送信する", () => {
    filter.catch(new Error("boom"), buildHost());

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
      }),
    );
    expect(pinoLogger.error).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("401（認証切れ）は info レベルでログ、Sentry には送らない（ノイズ回避）", () => {
    filter.catch(new UnauthorizedException("expired"), buildHost());

    expect(pinoLogger.info).toHaveBeenCalled();
    expect(pinoLogger.warn).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("4xx（403 を除く）は Sentry に送らない", () => {
    filter.catch(new ConflictException("dup"), buildHost());

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("403（権限エラー）は warning レベルで Sentry に送る（攻撃検知の可能性）", () => {
    const exception = new HttpException("forbidden", HttpStatus.FORBIDDEN);

    filter.catch(exception, buildHost());

    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("messageKey 付き BusinessException は i18n.translate の戻り値を message に入れる", () => {
    i18nMock.translate.mockReturnValueOnce("Email already registered");
    const exception = new BusinessException(
      ErrorCode.USER_EMAIL_ALREADY_EXISTS,
      HttpStatus.CONFLICT,
      "このメールアドレスは既に登録されています",
      undefined,
      "errors.conflict.duplicate_email",
      { email: "x@example.com" },
    );

    filter.catch(exception, buildHost());

    expect(i18nMock.translate).toHaveBeenCalledWith(
      "errors.conflict.duplicate_email",
      expect.objectContaining({ args: { email: "x@example.com" } }),
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Email already registered" }),
    );
  });

  it("messageKey の翻訳が失敗したら fallback の message を使う", () => {
    i18nMock.translate.mockImplementationOnce(() => {
      throw new Error("key not found");
    });
    const exception = new BusinessException(
      ErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      "対象が見つかりません",
      undefined,
      "errors.not_found.unknown",
    );

    filter.catch(exception, buildHost());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "対象が見つかりません" }),
    );
  });

  describe("videos モジュールの messageKey 経路", () => {
    // videos service / controller が投げる BusinessException が
    // errors.json の各キーを正しく I18nService に渡すことを保証する
    // （keys そのものは i18n/messages/ja/errors.json に定義されている前提）

    it("動画 NOT_FOUND は errors.not_found.video を i18n.translate に渡す", () => {
      i18nMock.translate.mockReturnValueOnce("動画が見つかりません");
      const exception = new BusinessException(
        ErrorCode.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        "動画が見つかりません",
        undefined,
        "errors.not_found.video",
      );

      filter.catch(exception, buildHost());

      expect(i18nMock.translate).toHaveBeenCalledWith("errors.not_found.video", expect.any(Object));
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          code: ErrorCode.NOT_FOUND,
          message: "動画が見つかりません",
        }),
      );
    });

    it("タスク NOT_FOUND は errors.not_found.video_task", () => {
      i18nMock.translate.mockReturnValueOnce("タスクが見つかりません");
      const exception = new BusinessException(
        ErrorCode.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        "タスクが見つかりません",
        undefined,
        "errors.not_found.video_task",
      );

      filter.catch(exception, buildHost());

      expect(i18nMock.translate).toHaveBeenCalledWith(
        "errors.not_found.video_task",
        expect.any(Object),
      );
    });

    it("閲覧期限切れは errors.forbidden_resource.video_expired", () => {
      i18nMock.translate.mockReturnValueOnce("この動画の閲覧期限が過ぎています");
      const exception = new BusinessException(
        ErrorCode.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        "この動画の閲覧期限が過ぎています",
        undefined,
        "errors.forbidden_resource.video_expired",
      );

      filter.catch(exception, buildHost());

      expect(i18nMock.translate).toHaveBeenCalledWith(
        "errors.forbidden_resource.video_expired",
        expect.any(Object),
      );
      expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it("ロール制限は errors.forbidden_resource.video_access_denied", () => {
      i18nMock.translate.mockReturnValueOnce("この動画へのアクセス権限がありません");
      const exception = new BusinessException(
        ErrorCode.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        "この動画へのアクセス権限がありません",
        undefined,
        "errors.forbidden_resource.video_access_denied",
      );

      filter.catch(exception, buildHost());

      expect(i18nMock.translate).toHaveBeenCalledWith(
        "errors.forbidden_resource.video_access_denied",
        expect.any(Object),
      );
    });

    it("パスワード不一致は errors.unauthorized_resource.video_password", () => {
      i18nMock.translate.mockReturnValueOnce("パスワードが正しくありません");
      const exception = new BusinessException(
        ErrorCode.UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED,
        "パスワードが正しくありません",
        undefined,
        "errors.unauthorized_resource.video_password",
      );

      filter.catch(exception, buildHost());

      expect(i18nMock.translate).toHaveBeenCalledWith(
        "errors.unauthorized_resource.video_password",
        expect.any(Object),
      );
      expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it("ファイル未選択は errors.validation.video_file_required", () => {
      i18nMock.translate.mockReturnValueOnce("動画ファイルが選択されていません");
      const exception = new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "動画ファイルが選択されていません",
        undefined,
        "errors.validation.video_file_required",
      );

      filter.catch(exception, buildHost());

      expect(i18nMock.translate).toHaveBeenCalledWith(
        "errors.validation.video_file_required",
        expect.any(Object),
      );
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });
});
