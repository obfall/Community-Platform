"use client";

import { useState } from "react";
import Link from "next/link";
import { useMailMessages } from "@/hooks/use-mail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Mail } from "lucide-react";
import type { MailMessage } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  sending: "送信中",
  sent: "送信済み",
  failed: "失敗",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  sending: "default",
  sent: "default",
  failed: "destructive",
};

export default function CampaignsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMailMessages({
    page,
    limit: 20,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const messages = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メール配信</h1>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* フィルタ */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="scheduled">予約済み</SelectItem>
            <SelectItem value="sending">送信中</SelectItem>
            <SelectItem value="sent">送信済み</SelectItem>
            <SelectItem value="failed">失敗</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* テーブル */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : messages.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Mail className="mx-auto mb-4 h-12 w-12" />
          <p>メッセージがありません</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>件名</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>対象</TableHead>
                <TableHead className="text-right">送信数</TableHead>
                <TableHead className="text-right">配信成功</TableHead>
                <TableHead>作成者</TableHead>
                <TableHead>作成日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg: MailMessage) => (
                <TableRow key={msg.id}>
                  <TableCell>
                    <Link href={`/campaigns/${msg.id}`} className="font-medium hover:underline">
                      {msg.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[msg.status] ?? "secondary"}>
                      {STATUS_LABELS[msg.status] ?? msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{msg.targetType}</TableCell>
                  <TableCell className="text-right">{msg.sentCount}</TableCell>
                  <TableCell className="text-right">{msg.deliveredCount}</TableCell>
                  <TableCell className="text-sm">{msg.createdBy.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* ページネーション */}
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
