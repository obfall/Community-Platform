"use client";

import { useState } from "react";
import { useActivityLogs, useExportActivityLogs } from "@/hooks/usage-history/use-activity-log";
import type { ActivityLogItem, ActivityLogQuery } from "@/lib/api/types";
import { ActivityLogFilters } from "./activity-log-filters";
import { ActivityLogTable } from "./activity-log-table";
import { ActivityLogDetailDialog } from "./activity-log-detail-dialog";
import { PaginationBar } from "@/components/pagination-bar";
import { ExportButton } from "./export-button";

export function ActivityLogTab() {
  const [query, setQuery] = useState<ActivityLogQuery>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<ActivityLogItem | null>(null);
  const { data, isLoading } = useActivityLogs(query);
  const exportCsv = useExportActivityLogs();

  const updateQuery = (partial: Partial<ActivityLogQuery>) => {
    setQuery((prev) => ({ ...prev, ...partial, page: partial.page ?? 1 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <ActivityLogFilters query={query} onQueryChange={updateQuery} />
        <ExportButton onClick={() => exportCsv.mutate(query)} disabled={exportCsv.isPending} />
      </div>

      <ActivityLogTable logs={data?.data ?? []} isLoading={isLoading} onSelect={setSelected} />

      {data?.meta && (
        <PaginationBar
          meta={data.meta}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      )}

      <ActivityLogDetailDialog
        log={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
