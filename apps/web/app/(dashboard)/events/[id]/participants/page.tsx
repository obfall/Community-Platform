"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useEventParticipants, useUpdateParticipantStatus } from "@/hooks/events/use-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import type { EventParticipant } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  applied: "申込済",
  canceled: "キャンセル",
};

const STATUS_VARIANTS: Record<string, "default" | "destructive"> = {
  applied: "default",
  canceled: "destructive",
};

export default function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEventParticipants(id, { page, limit: 50 });
  const updateStatus = useUpdateParticipantStatus();

  const participants = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">参加者一覧</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {meta && <Badge variant="secondary">{meta.total}人</Badge>}
          <Link href={`/events/${id}/stats`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1 h-4 w-4" />
              統計
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : participants.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">参加者がいません</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>参加者</TableHead>
              <TableHead>チケット</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>申込日</TableHead>
              <TableHead className="w-28">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p: EventParticipant) => {
              const isCanceled = p.status === "canceled";
              return (
                <TableRow key={p.id} className={isCanceled ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{p.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{p.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.ticket?.ticketName ?? "-"}</TableCell>
                  <TableCell className="text-sm">{p.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[p.status] ?? "default"}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.appliedAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    {isCanceled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          updateStatus.mutate({ participantId: p.id, status: "applied" })
                        }
                        disabled={updateStatus.isPending}
                      >
                        復帰
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          updateStatus.mutate({ participantId: p.id, status: "canceled" })
                        }
                        disabled={updateStatus.isPending}
                      >
                        キャンセル
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

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
    </div>
  );
}
