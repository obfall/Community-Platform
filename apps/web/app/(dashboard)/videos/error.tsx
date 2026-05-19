"use client";

import { useTranslations } from "next-intl";
import { ErrorFallback } from "@/components/error-boundary";

export default function VideosError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("videos.error");
  return (
    <ErrorFallback {...props} title={t("title")} description={t("description")} showReportDialog />
  );
}
