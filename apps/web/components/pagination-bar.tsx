"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/api/types";

interface PaginationBarProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/**
 * 一覧画面共通のページネーション。件数サマリー（全 N 件中 X〜Y 件）+ 前後ボタン+ ページ表示を提供する。
 * 全件 0 のときは何も描画しない。totalPages が 1 でもサマリーは表示し、ボタンは disabled になる。
 */
export function PaginationBar({ meta, onPageChange }: PaginationBarProps) {
  const t = useTranslations("common.pagination");

  if (meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {t("summary", { total: meta.total, from, to })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPreviousPage}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("previous")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {meta.page} / {Math.max(meta.totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNextPage}
        >
          {t("next")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
