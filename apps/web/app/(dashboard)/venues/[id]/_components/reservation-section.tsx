"use client";

import { useVenueReservations, useCancelReservation } from "@/hooks/venues/use-venues";
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

export function ReservationSection({ venueId }: { venueId: string }) {
  const { data: reservations, isLoading } = useVenueReservations(venueId);
  const cancelReservation = useCancelReservation();

  return (
    <div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : !reservations || reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">予約はありません</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>スペース</TableHead>
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
                  <TableCell className="text-sm">{r.space.name}</TableCell>
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
  );
}
