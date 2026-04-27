"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const eventIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    eventIdRef.current = Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>システムエラー</h1>
          <p style={{ color: "#666" }}>
            予期しないエラーが発生しました。お手数ですが再読み込みをお試しください。
          </p>
          {error.digest && (
            <p style={{ color: "#999", fontSize: "0.75rem" }}>エラー ID: {error.digest}</p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "#0f172a",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              再読み込み
            </button>
            <button
              onClick={() => Sentry.showReportDialog({ eventId: eventIdRef.current })}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "white",
                color: "#0f172a",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
              }}
            >
              問題を報告
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
