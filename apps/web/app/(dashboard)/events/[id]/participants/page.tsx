"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  useEventParticipants,
  useUpdateParticipantStatus,
  useNotifyParticipants,
} from "@/hooks/events/use-events";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BarChart3, ClipboardCheck, Bell } from "lucide-react";
import { ParticipantDetailDialog } from "../_components/participant-detail-dialog";
import type { EventParticipant } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  applied: "申込済",
  attended: "出席",
  no_show: "欠席",
  canceled: "キャンセル",
};

const STATUS_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  applied: "secondary",
  attended: "default",
  no_show: "outline",
  canceled: "destructive",
};

export default function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEventParticipants(id, { page, limit: 50 });
  const updateStatus = useUpdateParticipantStatus();
  const notifyMutation = useNotifyParticipants();

  // Detail dialog state
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Check-in mode state
  const [checkinMode, setCheckinMode] = useState(false);

  // Notify dialog state
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");

  const participants = data?.data ?? [];
  const meta = data?.meta;

  // Attendance stats
  const attendedCount = participants.filter(
    (p: EventParticipant) => p.status === "attended",
  ).length;
  const activeCount = participants.filter((p: EventParticipant) => p.status !== "canceled").length;

  const handleRowClick = (participantId: string) => {
    if (checkinMode) return;
    setSelectedParticipantId(participantId);
    setDetailOpen(true);
  };

  const handleNotifySend = () => {
    if (!notifyTitle.trim() || !notifyBody.trim()) return;
    notifyMutation.mutate(
      { eventId: id, data: { title: notifyTitle, body: notifyBody } },
      {
        onSuccess: () => {
          setNotifyOpen(false);
          setNotifyTitle("");
          setNotifyBody("");
        },
      },
    );
  };

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
          <Button variant="outline" size="sm" onClick={() => setNotifyOpen(true)}>
            <Bell className="mr-1 h-4 w-4" />
            一括通知
          </Button>
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
              <TableHead className="w-40">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p: EventParticipant) => {
              const isCanceled = p.status === "canceled";
              const isAttended = p.status === "attended";
              return (
                <TableRow
                  key={p.id}
                  className={`${isCanceled ? "opacity-50" : ""} ${!checkinMode ? "cursor-pointer hover:bg-muted/50" : ""}`}
                  onClick={() => handleRowClick(p.id)}
                >
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
                    <Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"}>
                      {STATUS_LABELS[p.status] ?? p.status}
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
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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

      {/* 参加者詳細ダイアログ */}
      <ParticipantDetailDialog
        eventId={id}
        participantId={selectedParticipantId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* 一括通知ダイアログ */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>参加者への一括通知</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>タイトル</Label>
              <Input
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="通知タイトル"
              />
            </div>
            <div>
              <Label>本文</Label>
              <Textarea
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                placeholder="通知メッセージを入力"
                rows={5}
              />
            </div>
            <Button
              onClick={handleNotifySend}
              disabled={!notifyTitle.trim() || !notifyBody.trim() || notifyMutation.isPending}
              className="w-full"
            >
              {notifyMutation.isPending ? "送信中..." : "送信"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
