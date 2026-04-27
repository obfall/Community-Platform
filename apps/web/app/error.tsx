"use client";

import { ErrorFallback } from "@/components/error-boundary";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback {...props} />;
}
