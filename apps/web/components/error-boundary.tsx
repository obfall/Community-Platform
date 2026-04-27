"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  showReportDialog?: boolean;
}

export function ErrorFallback({
  error,
  reset,
  title = "エラーが発生しました",
  description = "ページの読み込み中に問題が発生しました。再試行してください。",
  showReportDialog = false,
}: ErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground max-w-md">{description}</p>
      {error.digest && <p className="text-muted-foreground text-xs">エラー ID: {error.digest}</p>}
      <div className="mt-2 flex gap-3">
        <Button onClick={reset}>再試行</Button>
        {showReportDialog && (
          <Button
            variant="outline"
            onClick={() => Sentry.showReportDialog({ eventId: error.digest })}
          >
            問題を報告
          </Button>
        )}
      </div>
    </div>
  );
}
