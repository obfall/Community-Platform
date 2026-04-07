"use client";

import { useState } from "react";
import { useReservations, useCreateReservation, useCancelReservation } from "@/hooks/use-venues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export function ReservationSection({ spaceId }: { spaceId: string }) {
  const { data: reservations, isLoading } = useReservations(spaceId);
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const handleSubmit = () => {
    createReservation.mutate(
      {
        spaceId,
        data: { title: title || undefined, startAt, endAt },
      },
      {
        onSuccess: () => {
          setTitle("");
          setStartAt("");
          setEndAt("");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>タイトル（任意）</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="予約のタイトル"
          />
        </div>
        <div>
          <Label>開始日時</Label>
          <Input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div>
          <Label>終了日時</Label>
          <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={!startAt || !endAt || createReservation.isPending}>
        {createReservation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        予約する
      </Button>

      <div className="pt-4">
        <h4 className="mb-2 text-sm font-medium">予約一覧</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : !reservations || reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">予約はありません</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>終了</TableHead>
                  <TableHead>予約者</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.title ?? "-"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.startAt).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.endAt).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-sm">{r.user.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "confirmed"
                            ? "default"
                            : r.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelReservation.mutate(r.id)}
                          disabled={cancelReservation.isPending}
                        >
                          キャンセル
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
