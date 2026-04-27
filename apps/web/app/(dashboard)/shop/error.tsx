"use client";

import { ErrorFallback } from "@/components/error-boundary";

export default function ShopError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      {...props}
      title="ショップ情報の読み込みに失敗しました"
      description="一時的な問題の可能性があります。再試行して解決しない場合はサポートまでご連絡ください。"
      showReportDialog
    />
  );
}
