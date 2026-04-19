"use client";

import { useState } from "react";
import Link from "next/link";
import { useBroadcasts } from "@/hooks/broadcasts/use-broadcasts";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/select-field";
import { BroadcastHistoryTable } from "@/components/broadcasts/broadcast-history-table";
import { Plus, Megaphone } from "lucide-react";
import type { BroadcastStatus } from "@/lib/api/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "scheduled", label: "予約済み" },
  { value: "sending", label: "送信中" },
  { value: "sent", label: "送信済み" },
  { value: "failed", label: "失敗" },
];

export default function BroadcastsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBroadcasts({
    page,
    limit: 20,
    scope: "global",
    status: statusFilter === "all" ? undefined : (statusFilter as BroadcastStatus),
  });

  const broadcasts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">配信</h1>
        <Link href="/broadcasts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <SelectField
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          includeAll
          placeholder="ステータス"
          className="w-40"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : broadcasts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Megaphone className="mx-auto mb-4 h-12 w-12" />
          <p>配信がありません</p>
        </div>
      ) : (
        <>
          <BroadcastHistoryTable broadcasts={broadcasts} detailHrefPrefix="/broadcasts" />
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPreviousPage}
              >
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
