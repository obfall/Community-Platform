"use client";

import Link from "next/link";
import { useMyTickets } from "@/hooks/members/use-members";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, CalendarDays, MapPin, Monitor } from "lucide-react";
import type { MyTicketItem } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  applied: "申込済",
  confirmed: "確定",
  attended: "参加済",
  no_show: "不参加",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "secondary",
  confirmed: "default",
  attended: "outline",
  no_show: "destructive",
};

export default function ProfileTicketsPage() {
  const { data: tickets, isLoading } = useMyTickets();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">マイチケット</h2>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !tickets || tickets.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Ticket className="mx-auto mb-4 h-12 w-12" />
          <p>チケットはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((item: MyTicketItem) => (
            <Link key={item.id} href={`/events/${item.event.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{item.event.title}</p>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(item.event.startAt).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          {item.event.locationType === "online" ? (
                            <Monitor className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {item.event.venueName ?? item.event.locationType}
                        </div>
                      </div>
                      {item.ticket && (
                        <p className="mt-2 text-xs">
                          <span className="font-medium">{item.ticket.ticketName}</span>
                          {item.ticket.price > 0 && (
                            <span className="ml-2">
                              ¥{item.ticket.price.toLocaleString()} x {item.quantity}
                            </span>
                          )}
                        </p>
                      )}
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
