"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useEvent, useEventParticipants, useUpdateParticipantStatus } from "@/hooks/use-events";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { EventParticipant } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  applied: "申込済",
  confirmed: "確定",
  canceled: "キャンセル",
  attended: "出席",
  no_show: "欠席",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "outline",
  confirmed: "default",
  canceled: "destructive",
  attended: "default",
  no_show: "secondary",
};

export default function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: event } = useEvent(id);
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
        {meta && (
          <Badge variant="secondary" className="ml-auto">
            {meta.total}人
          </Badge>
        )}
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
              <TableHead>支払</TableHead>
              <TableHead>申込日</TableHead>
              <TableHead className="w-36">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p: EventParticipant) => (
              <TableRow key={p.id}>
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
                  <Badge variant={STATUS_VARIANTS[p.status] ?? "outline"}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.paymentMethod ?? "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.appliedAt).toLocaleDateString("ja-JP")}
                </TableCell>
                <TableCell>
                  <Select
                    value={p.status}
                    onValueChange={(status) => updateStatus.mutate({ participantId: p.id, status })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="applied">申込済</SelectItem>
                      <SelectItem value="confirmed">確定</SelectItem>
                      <SelectItem value="attended">出席</SelectItem>
                      <SelectItem value="no_show">欠席</SelectItem>
                      <SelectItem value="canceled">キャンセル</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
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
