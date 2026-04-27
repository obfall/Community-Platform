import "source-map-support/register";
import * as Sentry from "@sentry/nestjs";
import { HttpException } from "@nestjs/common";

const PII_KEY_PATTERN = /password|token|secret|authorization|refreshToken|accessToken/i;

function scrubPii(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrubPii);
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEY_PATTERN.test(key)) {
      result[key] = "[Filtered]";
    } else if (val && typeof val === "object") {
      result[key] = scrubPii(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE ?? process.env.RAILWAY_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    beforeSend(event, hint) {
      // 4xx の想定内エラーは送信しない
      const exception = hint.originalException;
      if (exception instanceof HttpException) {
        const status = exception.getStatus();
        if (status === 401 || status === 400 || status === 422 || status === 404) {
          return null;
        }
        if (status === 403) {
          event.level = "warning";
        }
      }

      // リクエストヘッダから機密情報を除去
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        delete headers["authorization"];
        delete headers["cookie"];
        delete headers["set-cookie"];
        event.request.headers = headers;
      }

      // リクエストボディの PII をスクラブ
      if (event.request?.data) {
        event.request.data = scrubPii(event.request.data) as typeof event.request.data;
      }

      // extra / contexts も再帰的にスクラブ
      if (event.extra) {
        event.extra = scrubPii(event.extra) as typeof event.extra;
      }

      return event;
    },
  });
}
