"use client";

import { ErrorFallback } from "@/components/error-boundary";

export default function VideosError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      {...props}
      title="動画の読み込みに失敗しました"
      description="再生中に問題が発生した可能性があります。再試行して解決しない場合はサポートまでご連絡ください。"
      showReportDialog
    />
  );
}
