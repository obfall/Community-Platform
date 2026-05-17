"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { ClipboardCheck } from "lucide-react";
import { PaginationBar } from "@/components/pagination-bar";
import type { EventParticipant } from "@/lib/api/types";

// 表示ラベルは enums.participantStatus（i18n）から取得する。
// バリアントは UI 用なのでこちらで一元管理。
const STATUS_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  applied: "secondary",
  attended: "default",
  no_show: "outline",
  canceled: "destructive",
};

export default function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tStatus = useTranslations("enums.participantStatus");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEventParticipants(id, { page, limit: 50 });
  const updateStatus = useUpdateParticipantStatus();

  // Check-in mode state
  const [checkinMode, setCheckinMode] = useState(false);

  const participants = data?.data ?? [];
  const meta = data?.meta;

  // Attendance stats
  const attendedCount = participants.filter(
    (p: EventParticipant) => p.status === "attended",
  ).length;
  const activeCount = participants.filter((p: EventParticipant) => p.status !== "canceled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">参加者一覧</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {checkinMode && (
            <span className="text-sm text-muted-foreground">
              出席 {attendedCount}/{activeCount}
            </span>
          )}
          {meta && <Badge variant="secondary">{meta.total}人</Badge>}
          <Button
            variant={checkinMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCheckinMode(!checkinMode)}
          >
            <ClipboardCheck className="mr-1 h-4 w-4" />
            {checkinMode ? "チェックイン中" : "チェックイン"}
          </Button>
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
              <TableHead className="w-40">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p: EventParticipant) => {
              const isCanceled = p.status === "canceled";
              const isAttended = p.status === "attended";
              return (
                <TableRow key={p.id} className={isCanceled ? "opacity-50" : ""}>
                  <TableCell>
                    <Link
                      href={`/members/${p.user.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{p.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{p.user.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{p.ticket?.ticketName ?? "-"}</TableCell>
                  <TableCell className="text-sm">{p.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"}>
                      {tStatus(p.status)}
                    </Badge>
                    {isAttended && p.attendedAt && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {new Date(p.attendedAt).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.appliedAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {checkinMode ? (
                        !isCanceled && (
                          <>
                            <Button
                              variant={isAttended ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                updateStatus.mutate({ participantId: p.id, status: "attended" })
                              }
                              disabled={isAttended || updateStatus.isPending}
                            >
                              出席
                            </Button>
                            <Button
                              variant={p.status === "no_show" ? "destructive" : "outline"}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                updateStatus.mutate({ participantId: p.id, status: "no_show" })
                              }
                              disabled={p.status === "no_show" || updateStatus.isPending}
                            >
                              欠席
                            </Button>
                          </>
                        )
                      ) : isCanceled ? (
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
                          参加取消
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {meta && <PaginationBar meta={meta} onPageChange={setPage} />}
    </div>
  );
}
