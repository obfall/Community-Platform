"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  prevVideo: { id: string; title: string; watchOrder: number | null } | null;
  nextVideo: { id: string; title: string; watchOrder: number | null } | null;
  currentOrder: number | null;
  seriesVideoCount: number | null;
}

export function SeriesNav({ prevVideo, nextVideo, currentOrder, seriesVideoCount }: Props) {
  const t = useTranslations("videos.seriesNav");
  if (!prevVideo && !nextVideo) return null;

  return (
    <div className="space-y-2">
      {currentOrder != null && seriesVideoCount != null && (
        <p className="text-sm text-muted-foreground text-center">
          {t("summary", { current: currentOrder, total: seriesVideoCount })}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        {prevVideo ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/videos/${prevVideo.id}`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              <span className="truncate max-w-[120px]">{prevVideo.title}</span>
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {nextVideo ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/videos/${nextVideo.id}`}>
              <span className="truncate max-w-[120px]">{nextVideo.title}</span>
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
