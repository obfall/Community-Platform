"use client";

import { useMyReservations } from "@/hooks/members/use-members";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Clock, MapPin } from "lucide-react";
import type { MyReservationItem } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "申請中",
  approved: "承認済",
  rejected: "却下",
  canceled: "キャンセル",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  canceled: "outline",
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfileReservationsPage() {
  const { data: reservations, isLoading } = useMyReservations();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">マイ予約</h2>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !reservations || reservations.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CalendarCheck className="mx-auto mb-4 h-12 w-12" />
          <p>予約はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((item: MyReservationItem) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.title ?? item.space.name}</p>
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.space.venue.name} / {item.space.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3" />
                        {new Date(item.startAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.startAt)} 〜 {formatTime(item.endAt)}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={STATUS_VARIANTS[item.status] ?? "secondary"}
                    className="shrink-0 text-xs"
                  >
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
