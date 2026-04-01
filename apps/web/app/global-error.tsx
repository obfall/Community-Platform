"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <h2 className="text-2xl font-bold">エラーが発生しました</h2>
          <button
            className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => reset()}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
