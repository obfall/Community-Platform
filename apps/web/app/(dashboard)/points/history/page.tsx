"use client";

import { useState } from "react";
import Link from "next/link";
import { usePointHistory } from "@/hooks/points/use-points";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import type { PointHistoryQuery } from "@/lib/api/types";

const TYPE_LABELS: Record<string, string> = {
  admin_grant: "管理者付与",
  rule_grant: "自動付与",
  utilization: "利用",
  event_grant: "イベント付与",
  expiry: "失効",
  admin_adjust: "管理者調整",
};

export default function PointHistoryPage() {
  const [query, setQuery] = useState<PointHistoryQuery>({ page: 1, limit: 20 });
  const { data, isLoading } = usePointHistory(query);
  const histories = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/points">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">ポイント履歴</h1>
      </div>

      <Select
        value={query.type ?? "all"}
        onValueChange={(v) =>
          setQuery((p) => ({ ...p, type: v === "all" ? undefined : v, page: 1 }))
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="種別" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : histories.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">履歴がありません</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>付与者</TableHead>
              <TableHead>有効期限</TableHead>
              <TableHead className="text-right">ポイント</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {histories.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{new Date(h.createdAt).toLocaleDateString("ja-JP")}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {TYPE_LABELS[h.type] ?? h.type}
                  </Badge>
                </TableCell>
                <TableCell>{h.description ?? "-"}</TableCell>
                <TableCell>{h.grantedBy?.name ?? "-"}</TableCell>
                <TableCell>
                  {h.expiresAt ? new Date(h.expiresAt).toLocaleDateString("ja-JP") : "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-bold ${h.points > 0 ? "text-green-600" : "text-red-500"}`}
                >
                  {h.points > 0 ? "+" : ""}
                  {h.points.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {meta && (
        <PaginationBar meta={meta} onPageChange={(page) => setQuery((p) => ({ ...p, page }))} />
      )}
    </div>
  );
}
