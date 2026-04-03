"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/lib/api/types";

interface MembersPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function MembersPagination({ meta, onPageChange }: MembersPaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        全 {meta.total} 件中 {(meta.page - 1) * meta.limit + 1}〜
        {Math.min(meta.page * meta.limit, meta.total)} 件を表示
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPreviousPage}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          前へ
        </Button>
        <span className="text-sm text-muted-foreground">
          {meta.page} / {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNextPage}
        >
          次へ
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
