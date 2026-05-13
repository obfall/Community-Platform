"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvent, useDuplicateEvent, useDeleteEvent } from "@/hooks/events/use-events";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  MapPin,
  Monitor,
  Users,
  Clock,
  Pencil,
  Copy,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { InfoRow } from "./_components/info-row";
import { TicketSection } from "./_components/ticket-section";
import { ApplicationFormSection } from "./_components/application-form-section";
import { EVENT_ORGANIZATION_ROLE_LABELS } from "@/lib/events/organization-role";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  recruiting: "募集中",
  closed: "締切",
  canceled: "中止",
  ended: "終了",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  draft: "secondary",
  recruiting: "success",
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
  const router = useRouter();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const duplicateEvent = useDuplicateEvent();
  const deleteEvent = useDeleteEvent();
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">イベントが見つかりません</div>;
  }

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const banner = STATUS_BANNER[event.status];

  const handleDuplicate = () => {
    duplicateEvent.mutate(id, {
      onSuccess: (newEvent) => {
        setDuplicateDialogOpen(false);
        router.push(`/events/${newEvent.id}/edit`);
      },
    });
  };

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
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/events/${id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDuplicateDialogOpen(true)}>
                <Copy className="mr-2 h-4 w-4" />
                複製
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
        <div className="h-80 overflow-hidden rounded-lg bg-muted md:h-96">
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
          <Card>
            <CardHeader>
              <CardTitle>関係団体</CardTitle>
            </CardHeader>
            <CardContent>
              {event.organizations && event.organizations.length > 0 ? (
                <div className="space-y-2">
                  {event.organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between text-sm">
                      <span>{org.organizationName}</span>
                      <Badge variant="outline">
                        {EVENT_ORGANIZATION_ROLE_LABELS[org.role] ?? org.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">なし</p>
              )}
            </CardContent>
          </Card>

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

          {/* 申込フォーム設定（admin のみ） */}
          {isAdmin && <ApplicationFormSection eventId={id} />}
        </div>

        {/* 右: サイドバー */}
        <div className="space-y-4">
          {/* 参加申込 CTA */}
          {event.status === "recruiting" && (
            <Card>
              <CardContent className="space-y-3 p-4">
                {event.registrationDeadlineAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      申込締切:{" "}
                      {new Date(event.registrationDeadlineAt).toLocaleString("ja-JP", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                <Link href={`/events/${id}/apply`}>
                  <Button className="w-full" size="lg">
                    参加申込
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* チケット */}
          <TicketSection eventId={id} tickets={event.tickets} isAdmin={isAdmin} />
        </div>
      </div>

      {/* 複製確認ダイアログ */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>イベントを複製</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>このイベントを元に新しいイベント（下書き）を作成します。</p>
                <div>
                  <p className="font-medium text-foreground">引き継がれる項目</p>
                  <p>基本情報・チケット・申込フォーム設定・カスタム質問・登壇者・関係団体・タグ</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">引き継がれない項目</p>
                  <p>参加者・回答データ・実施結果・割引コード・ファイル・チケット販売数</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate} disabled={duplicateEvent.isPending}>
              {duplicateEvent.isPending ? "複製中..." : "複製する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>イベントを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{event.title}」を削除します。この操作は論理削除です。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteEvent.mutate(id, { onSuccess: () => router.push("/events") });
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
