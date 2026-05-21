"use client";

import Link from "next/link";
import { useMyReservations } from "@/hooks/profile/use-reservations";
import { useSkillBookings } from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Clock, GraduationCap, MapPin } from "lucide-react";
import type { MyReservationItem, SkillBooking } from "@/lib/api/types";

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

function formatSkillDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfileReservationsPage() {
  const { user } = useAuth();
  const { data: reservations, isLoading } = useMyReservations();
  const { data: bookings, isLoading: isBookingsLoading } = useSkillBookings();

  const approvedSkillBookings = (bookings ?? []).filter(
    (b) =>
      b.status === "approved" && (b.providerUserId === user?.id || b.requesterUserId === user?.id),
  );

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">マイ予約</h2>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">会場予約</h3>
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground">読み込み中...</div>
        ) : !reservations || reservations.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            <CalendarCheck className="mx-auto mb-2 h-8 w-8" />
            <p>会場予約はありません</p>
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
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">スキル予約</h3>
        {isBookingsLoading ? (
          <div className="py-6 text-center text-muted-foreground">読み込み中...</div>
        ) : approvedSkillBookings.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            <GraduationCap className="mx-auto mb-2 h-8 w-8" />
            <p>承認済のスキル予約はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedSkillBookings.map((b: SkillBooking) => {
              const isProvider = b.providerUserId === user?.id;
              const counterpart = isProvider ? b.requester : b.provider;
              const roleLabel = isProvider ? "リクエスター" : "提供者";
              return (
                <Link key={b.id} href={`/skills/bookings/${b.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{b.skillListing.title}</p>
                          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {roleLabel}: {counterpart.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarCheck className="h-3 w-3" />
                              {b.scheduledAt ? formatSkillDateTime(b.scheduledAt) : "日時未定"}
                            </div>
                          </div>
                        </div>
                        <Badge variant="default" className="shrink-0 text-xs">
                          承認済
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
