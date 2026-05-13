"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EVENT_STATUS_VARIANTS, EVENT_STATUS_BANNER_CLASSES } from "@/lib/events/event-status";
import { EventStatus, EventLocationType } from "@community-platform/shared";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("events.detail");
  const tCard = useTranslations("events.form.card");
  const tBanner = useTranslations("events.banner");
  const tStatus = useTranslations("enums.eventStatus");
  const tSpeakerRole = useTranslations("enums.eventSpeakerRole");
  const tOrgRole = useTranslations("enums.eventOrganizationRole");
  const tLocation = useTranslations("enums.eventLocationType");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const duplicateEvent = useDuplicateEvent();
  const deleteEvent = useDeleteEvent();
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
  }

  if (!event) {
    return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>;
  }

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const bannerClasses = EVENT_STATUS_BANNER_CLASSES[event.status];

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
            <Badge variant={EVENT_STATUS_VARIANTS[event.status] ?? "secondary"}>
              {tStatus(event.status)}
            </Badge>
            {event.tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("createdBy", { name: event.createdBy.name })}
          </p>
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
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDuplicateDialogOpen(true)}>
                <Copy className="mr-2 h-4 w-4" />
                {t("duplicate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ステータスバナー */}
      {bannerClasses && (
        <div
          className={`rounded-lg border p-3 text-center text-sm font-medium ${bannerClasses.bg} ${bannerClasses.text}`}
        >
          {tBanner(event.status)}
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
              <CardTitle>{tCard("basicInfo")}</CardTitle>
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
                    {t("deadlineLabel", {
                      date: new Date(event.registrationDeadlineAt).toLocaleString("ja-JP", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    })}
                  </p>
                </div>
              )}

              {/* 会場 */}
              <div className="flex items-start gap-3 text-sm">
                {event.locationType === EventLocationType.ONLINE ? (
                  <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">{event.venueName ?? tLocation(event.locationType)}</p>
                  {event.venueAddress && (
                    <p className="text-muted-foreground">{event.venueAddress}</p>
                  )}
                  {event.onlineUrl && <p className="text-muted-foreground">{event.onlineUrl}</p>}
                </div>
              </div>

              {/* 参加者数 */}
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="font-medium">
                  {t("participantsLabel", { count: event.participantCount })}
                </p>
              </div>

              {/* 企画役割 */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{t("planningPrefix")}</span>
                <span>{event.planningRole}</span>
                {event.eventType && (
                  <>
                    <span className="text-muted-foreground">{t("typePrefix")}</span>
                    <span>{event.eventType}</span>
                  </>
                )}
              </div>

              <Separator />

              {/* 概要 */}
              {event.description && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    {t("descriptionLabel")}
                  </p>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 登壇者 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("speakersCard")}</CardTitle>
            </CardHeader>
            <CardContent>
              {event.speakers && event.speakers.length > 0 ? (
                <div className="space-y-3">
                  {event.speakers.map((speaker) => (
                    <div key={speaker.id} className="flex items-center gap-3">
                      {speaker.user && (
                        <Avatar className="h-9 w-9">
                          {speaker.user.avatarUrl && (
                            <AvatarImage src={speaker.user.avatarUrl} alt={speaker.name} />
                          )}
                          <AvatarFallback>{speaker.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <p className="text-sm font-medium">{speaker.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {speaker.title && `${speaker.title} / `}
                          {tSpeakerRole(speaker.role)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noneFallback")}</p>
              )}
            </CardContent>
          </Card>

          {/* 関係団体 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("organizationsCard")}</CardTitle>
            </CardHeader>
            <CardContent>
              {event.organizations && event.organizations.length > 0 ? (
                <div className="space-y-2">
                  {event.organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between text-sm">
                      <span>{org.organizationName}</span>
                      <Badge variant="outline">{tOrgRole(org.role)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noneFallback")}</p>
              )}
            </CardContent>
          </Card>

          {/* 詳細情報 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("detailInfoCard")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {event.language && <InfoRow label={t("infoRow.language")} value={event.language} />}
              {event.accessInfo && (
                <InfoRow label={t("infoRow.accessInfo")} value={event.accessInfo} />
              )}
              {event.participationMethod && (
                <InfoRow
                  label={t("infoRow.participationMethod")}
                  value={event.participationMethod}
                />
              )}
              {event.contactInfo && (
                <InfoRow label={t("infoRow.contactInfo")} value={event.contactInfo} />
              )}
              {event.cancellationPolicy && (
                <InfoRow label={t("infoRow.cancellationPolicy")} value={event.cancellationPolicy} />
              )}
            </CardContent>
          </Card>

          {/* 申込フォーム設定（admin のみ） */}
          {isAdmin && <ApplicationFormSection eventId={id} />}
        </div>

        {/* 右: サイドバー */}
        <div className="space-y-4">
          {/* 参加申込 CTA */}
          {event.status === EventStatus.RECRUITING && (
            <Card>
              <CardContent className="space-y-3 p-4">
                {event.registrationDeadlineAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {t("deadlineLabel", {
                        date: new Date(event.registrationDeadlineAt).toLocaleString("ja-JP", {
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      })}
                    </span>
                  </div>
                )}
                <Link href={`/events/${id}/apply`}>
                  <Button className="w-full" size="lg">
                    {t("applyButton")}
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
            <AlertDialogTitle>{t("duplicateDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>{t("duplicateDialog.intro")}</p>
                <div>
                  <p className="font-medium text-foreground">
                    {t("duplicateDialog.inheritsLabel")}
                  </p>
                  <p>{t("duplicateDialog.inheritsText")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t("duplicateDialog.notInheritsLabel")}
                  </p>
                  <p>{t("duplicateDialog.notInheritsText")}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate} disabled={duplicateEvent.isPending}>
              {duplicateEvent.isPending
                ? t("duplicateDialog.duplicating")
                : t("duplicateDialog.duplicateAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", { title: event.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteEvent.mutate(id, { onSuccess: () => router.push("/events") });
              }}
            >
              {t("deleteDialog.action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
