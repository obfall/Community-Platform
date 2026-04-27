import * as Sentry from "@sentry/nextjs";

const PII_KEY_PATTERN = /password|token|secret|authorization|refreshToken|accessToken/i;

function scrubPii(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrubPii);
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = PII_KEY_PATTERN.test(key) ? "[Filtered]" : scrubPii(val);
  }
  return result;
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        delete headers["authorization"];
        delete headers["cookie"];
        event.request.headers = headers;
      }
      if (event.request?.data) {
        event.request.data = scrubPii(event.request.data) as typeof event.request.data;
      }
      if (event.extra) {
        event.extra = scrubPii(event.extra) as typeof event.extra;
      }
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
