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
    filter = new AllExceptionsFilter(pinoLogger as never);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const getHeader = jest.fn().mockReturnValue(undefined);
    response = { status, json, getHeader };
    request = { url: "/api/users", method: "POST", id: "req-test-1" };
  });

  it("returns BusinessException payload as-is", () => {
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

  it("infers code from a standard HttpException status", () => {
    const exception = new ConflictException("競合");

    filter.catch(exception, buildHost());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
      }),
    );
  });

  it("maps Prisma P2002 to 409 CONFLICT with field details", () => {
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

  it("maps Prisma P2025 to 404 NOT_FOUND", () => {
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

  it("maps Prisma P2003 to 400 VALIDATION_FAILED", () => {
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

  it("returns 500 INTERNAL_ERROR for unknown exception and reports to Sentry", () => {
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

  it("logs 401 at info level and does NOT send to Sentry", () => {
    filter.catch(new UnauthorizedException("expired"), buildHost());

    expect(pinoLogger.info).toHaveBeenCalled();
    expect(pinoLogger.warn).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("does NOT report 4xx (except 403) to Sentry", () => {
    filter.catch(new ConflictException("dup"), buildHost());

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports 403 to Sentry as warning", () => {
    const exception = new HttpException("forbidden", HttpStatus.FORBIDDEN);

    filter.catch(exception, buildHost());

    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
