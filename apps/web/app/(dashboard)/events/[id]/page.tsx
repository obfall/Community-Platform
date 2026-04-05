"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useEvent, useParticipate, useCreateTicket } from "@/hooks/use-events";
import { eventsApi } from "@/lib/api/events";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  MapPin,
  Monitor,
  Users,
  Ticket,
  Clock,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import type { EventTicket as EventTicketType } from "@/lib/api/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  recruiting: "募集中",
  closed: "締切",
  canceled: "中止",
  ended: "終了",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  recruiting: "default",
  closed: "outline",
  canceled: "destructive",
  ended: "outline",
};

const STATUS_BANNER: Record<string, { bg: string; text: string; message: string }> = {
  recruiting: {
    bg: "bg-green-50 border-green-200",
    text: "text-green-800",
    message: "現在募集中です",
  },
  closed: {
    bg: "bg-yellow-50 border-yellow-200",
    text: "text-yellow-800",
    message: "募集は締め切りました",
  },
  canceled: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    message: "このイベントは中止になりました",
  },
  ended: {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-600",
    message: "このイベントは終了しました",
  },
  draft: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    message: "下書き — まだ公開されていません",
  },
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const participate = useParticipate();

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">イベントが見つかりません</div>;
  }

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const banner = STATUS_BANNER[event.status];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={STATUS_VARIANTS[event.status] ?? "secondary"}>
              {STATUS_LABELS[event.status] ?? event.status}
            </Badge>
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
            <>
              <Link href={`/events/${id}/edit`}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </Button>
              </Link>
              <Link href={`/events/${id}/participants`}>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  参加者一覧
                </Button>
              </Link>
            </>
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

      {/* ステータスバナー */}
      {banner && (
        <div
          className={`rounded-lg border p-3 text-center text-sm font-medium ${banner.bg} ${banner.text}`}
        >
          {banner.message}
        </div>
      )}

      {/* カバー画像 */}
      {event.coverImageUrl && (
        <div className="h-64 overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左: メイン情報 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 日時 */}
              <div className="flex items-start gap-3 text-sm">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {new Date(event.startAt).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    〜{" "}
                    {new Date(event.endAt).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {event.registrationDeadlineAt && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p>
                    申込締切:{" "}
                    {new Date(event.registrationDeadlineAt).toLocaleString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {/* 会場 */}
              <div className="flex items-start gap-3 text-sm">
                {event.locationType === "online" ? (
                  <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">{event.venueName ?? event.locationType}</p>
                  {event.venueAddress && (
                    <p className="text-muted-foreground">{event.venueAddress}</p>
                  )}
                  {event.onlineUrl && <p className="text-muted-foreground">{event.onlineUrl}</p>}
                </div>
              </div>

              {/* 参加者数 */}
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="font-medium">{event.participantCount}人参加</p>
              </div>

              {/* 企画役割 */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">企画:</span>
                <span>{event.planningRole}</span>
                {event.eventType && (
                  <>
                    <span className="text-muted-foreground">種別:</span>
                    <span>{event.eventType}</span>
                  </>
                )}
              </div>

              <Separator />

              {/* 概要 */}
              {event.description && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">概要</p>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
              {event.language && <InfoRow label="使用言語" value={event.language} />}
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
          {/* チケット */}
          <TicketSection eventId={id} tickets={event.tickets} isAdmin={isAdmin} />
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

function TicketSection({
  eventId,
  tickets,
  isAdmin,
}: {
  eventId: string;
  tickets: EventTicketType[];
  isAdmin: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("");
  const [purchaseLimit, setPurchaseLimit] = useState("1");
  const createTicket = useCreateTicket();
  const queryClient = useQueryClient();

  const handleCreate = () => {
    createTicket.mutate(
      {
        eventId,
        data: {
          ticketName,
          price: parseInt(price, 10) || 0,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
          purchaseLimit: parseInt(purchaseLimit, 10) || 1,
        },
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setTicketName("");
          setPrice("0");
          setCapacity("");
          setPurchaseLimit("1");
        },
      },
    );
  };

  const handleDelete = async (ticketId: string) => {
    try {
      await eventsApi.deleteTicket(ticketId);
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      toast.success("チケットを削除しました");
    } catch {
      toast.error("チケットの削除に失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            チケット
          </CardTitle>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-3 w-3" />
                  追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>チケット追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>チケット名</Label>
                    <Input
                      value={ticketName}
                      onChange={(e) => setTicketName(e.target.value)}
                      placeholder="例: 一般チケット"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>価格（円）</Label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label>定員（空欄=無制限）</Label>
                      <Input
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        min="1"
                        placeholder="無制限"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>1人あたり購入上限</Label>
                    <Input
                      type="number"
                      value={purchaseLimit}
                      onChange={(e) => setPurchaseLimit(e.target.value)}
                      min="1"
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={!ticketName || createTicket.isPending}
                    className="w-full"
                  >
                    追加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">チケットがありません</p>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="text-sm font-medium">{ticket.ticketName}</p>
                {ticket.capacity != null && (
                  <p className="text-xs text-muted-foreground">
                    残り {ticket.capacity - ticket.soldCount} / {ticket.capacity}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">
                  {ticket.price === 0 ? "無料" : `¥${ticket.price.toLocaleString()}`}
                </p>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(ticket.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
