"use client";

import { useState } from "react";
import {
  useLoginHistories,
  useExportLoginHistories,
} from "@/hooks/usage-history/use-login-history";
import type { LoginHistoryItem, LoginHistoryQuery } from "@/lib/api/types";
import { LoginHistoryFilters } from "./login-history-filters";
import { LoginHistoryTable } from "./login-history-table";
import { LoginHistoryDetailDialog } from "./login-history-detail-dialog";
import { PaginationBar } from "@/components/pagination-bar";
import { ExportButton } from "./export-button";

export function LoginHistoryTab() {
  const [query, setQuery] = useState<LoginHistoryQuery>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<LoginHistoryItem | null>(null);
  const { data, isLoading } = useLoginHistories(query);
  const exportCsv = useExportLoginHistories();

  const updateQuery = (partial: Partial<LoginHistoryQuery>) => {
    setQuery((prev) => ({ ...prev, ...partial, page: partial.page ?? 1 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <LoginHistoryFilters query={query} onQueryChange={updateQuery} />
        <ExportButton onClick={() => exportCsv.mutate(query)} disabled={exportCsv.isPending} />
      </div>

      <LoginHistoryTable logs={data?.data ?? []} isLoading={isLoading} onSelect={setSelected} />

      {data?.meta && (
        <PaginationBar
          meta={data.meta}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      )}

      <LoginHistoryDetailDialog
        log={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
