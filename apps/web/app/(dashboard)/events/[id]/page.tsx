"use client";

import { use } from "react";
import Link from "next/link";
import { useEvent, useParticipate, useCancelParticipation } from "@/hooks/use-events";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CalendarDays, MapPin, Monitor, Users, Ticket, Clock } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  recruiting: "募集中",
  closed: "締切",
  canceled: "中止",
  ended: "終了",
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const participate = useParticipate();
  const cancelParticipation = useCancelParticipation();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">イベントが見つかりません</div>;
  }

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        <Link href="/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge>{STATUS_LABELS[event.status] ?? event.status}</Badge>
            {event.category && <Badge variant="outline">{event.category.name}</Badge>}
            {event.tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">作成者: {event.createdBy.name}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href={`/events/${id}/participants`}>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                参加者一覧
              </Button>
            </Link>
          )}
          {event.status === "recruiting" && (
            <Button
              onClick={() => participate.mutate({ eventId: id })}
              disabled={participate.isPending}
            >
              参加申込
            </Button>
          )}
        </div>
      </div>

      {/* カバー画像 */}
      {event.coverImageUrl && (
        <div className="h-64 overflow-hidden rounded-lg bg-muted">
          <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左: メイン情報 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 概要 */}
          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle>概要</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {event.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 登壇者 */}
          {event.speakers && event.speakers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>登壇者</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.speakers.map((speaker) => (
                    <div key={speaker.id} className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{speaker.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {speaker.title && `${speaker.title} / `}
                          {speaker.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 関係団体 */}
          {event.organizations && event.organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>関係団体</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between text-sm">
                      <span>{org.organizationName}</span>
                      <Badge variant="outline">{org.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 詳細情報 */}
          <Card>
            <CardHeader>
              <CardTitle>詳細情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {event.accessInfo && <InfoRow label="アクセス" value={event.accessInfo} />}
              {event.participationMethod && (
                <InfoRow label="参加方法" value={event.participationMethod} />
              )}
              {event.contactInfo && <InfoRow label="問合せ先" value={event.contactInfo} />}
              {event.cancellationPolicy && (
                <InfoRow label="キャンセルポリシー" value={event.cancellationPolicy} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右: サイドバー */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p>{new Date(event.startAt).toLocaleString("ja-JP")}</p>
                  <p className="text-muted-foreground">
                    〜 {new Date(event.endAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>

              {event.registrationDeadlineAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    締切: {new Date(event.registrationDeadlineAt).toLocaleString("ja-JP")}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                {event.locationType === "online" ? (
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{event.venueName ?? event.locationType}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{event.participantCount}人参加</span>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground">企画: {event.planningRole}</p>
            </CardContent>
          </Card>

          {/* チケット */}
          {event.tickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  チケット
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{ticket.ticketName}</p>
                      {ticket.capacity && (
                        <p className="text-xs text-muted-foreground">
                          残り {ticket.capacity - ticket.soldCount} / {ticket.capacity}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-bold">
                      {ticket.price === 0 ? "無料" : `¥${ticket.price.toLocaleString()}`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
