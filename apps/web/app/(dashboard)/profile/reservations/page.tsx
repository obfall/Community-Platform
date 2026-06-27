"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useMyReservations } from "@/hooks/profile/use-reservations";
import { useSkillBookings } from "@/hooks/skills/use-skills";
import { useCancelReservation } from "@/hooks/venues/use-venues";
import { useAuth } from "@/hooks/auth/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarCheck, Clock, GraduationCap, MapPin } from "lucide-react";
import type { MyReservationItem, SkillBooking } from "@/lib/api/types";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  canceled: "outline",
};

const CANCELABLE_STATUSES = ["pending", "approved"];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
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
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("profile.reservations.status");
  const { user } = useAuth();
  const { data: reservations, isLoading } = useMyReservations();
  const { data: bookings, isLoading: isBookingsLoading } = useSkillBookings();

  const [selectedVenue, setSelectedVenue] = useState<MyReservationItem | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillBooking | null>(null);

  const approvedSkillBookings = (bookings ?? []).filter(
    (b) =>
      b.status === "approved" && (b.providerUserId === user?.id || b.requesterUserId === user?.id),
  );

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">{t("reservations.title")}</h2>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("reservations.venueSection")}</h3>
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground">{tCommon("loading")}</div>
        ) : !reservations || reservations.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            <CalendarCheck className="mx-auto mb-2 h-8 w-8" />
            <p>{t("reservations.noVenueReservations")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((item: MyReservationItem) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedVenue(item)}
                className="w-full text-left"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {item.title ?? item.space.name}
                        </p>
                        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {item.space.venue.name} / {item.space.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarCheck className="h-3 w-3 shrink-0" />
                            {formatDate(item.startAt)}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={STATUS_VARIANTS[item.status] ?? "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {tStatus.has(item.status) ? tStatus(item.status) : item.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("reservations.skillSection")}</h3>
        {isBookingsLoading ? (
          <div className="py-6 text-center text-muted-foreground">{tCommon("loading")}</div>
        ) : approvedSkillBookings.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            <GraduationCap className="mx-auto mb-2 h-8 w-8" />
            <p>{t("reservations.noSkillBookings")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedSkillBookings.map((b: SkillBooking) => {
              const isProvider = b.providerUserId === user?.id;
              const counterpart = isProvider ? b.requester : b.provider;
              const roleLabel = isProvider
                ? t("reservations.requesterRole")
                : t("reservations.providerRole");
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedSkill(b)}
                  className="w-full text-left"
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{b.skillListing.title}</p>
                          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 shrink-0" />
                              {roleLabel}: {counterpart.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarCheck className="h-3 w-3 shrink-0" />
                              {b.scheduledAt
                                ? formatSkillDateTime(b.scheduledAt)
                                : t("reservations.dateUndecided")}
                            </div>
                          </div>
                        </div>
                        <Badge variant="default" className="shrink-0 text-xs">
                          {t("reservations.status.approved")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <VenueReservationDetailDialog item={selectedVenue} onClose={() => setSelectedVenue(null)} />
      <SkillBookingDetailDialog booking={selectedSkill} onClose={() => setSelectedSkill(null)} />
    </div>
  );
}

function VenueReservationDetailDialog({
  item,
  onClose,
}: {
  item: MyReservationItem | null;
  onClose: () => void;
}) {
  const t = useTranslations("profile.reservations.venueDetail");
  const tStatus = useTranslations("profile.reservations.status");
  const queryClient = useQueryClient();
  const cancelReservation = useCancelReservation();

  if (!item) return null;

  const canCancel = CANCELABLE_STATUSES.includes(item.status);

  const handleCancel = () => {
    cancelReservation.mutate(item.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["my", "reservations"] });
        onClose();
      },
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{item.title ?? item.space.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold">{item.title ?? item.space.name}</p>
            <Badge variant={STATUS_VARIANTS[item.status] ?? "secondary"} className="mt-1 text-xs">
              {tStatus.has(item.status) ? tStatus(item.status) : item.status}
            </Badge>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-foreground">
                {item.space.venue.name} / {item.space.name}
              </span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-foreground">{formatDate(item.startAt)}</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-foreground">
                {formatTime(item.startAt)} 〜 {formatTime(item.endAt)}
              </span>
            </div>

            {item.note && (
              <div className="flex justify-between gap-2 border-t pt-2">
                <dt className="text-muted-foreground">{t("note")}</dt>
                <dd className="text-right font-medium">{item.note}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("createdAt")}</dt>
              <dd className="text-right font-medium">{formatDateTime(item.createdAt)}</dd>
            </div>
          </dl>

          <Button asChild variant="outline" className="w-full">
            <Link href={`/venues/${item.space.venue.id}`}>{t("viewVenue")}</Link>
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-center">
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={cancelReservation.isPending}>
                  {t("cancel")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("confirmBack")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>{t("confirmAction")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkillBookingDetailDialog({
  booking,
  onClose,
}: {
  booking: SkillBooking | null;
  onClose: () => void;
}) {
  const t = useTranslations("profile.reservations.skillDetail");
  const tReservations = useTranslations("profile.reservations");
  const { user } = useAuth();

  if (!booking) return null;

  const isProvider = booking.providerUserId === user?.id;
  const counterpart = isProvider ? booking.requester : booking.provider;
  const roleLabel = isProvider ? tReservations("requesterRole") : tReservations("providerRole");

  return (
    <Dialog open={!!booking} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{booking.skillListing.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold">{booking.skillListing.title}</p>
            <Badge variant="default" className="mt-1 text-xs">
              {tReservations("status.approved")}
            </Badge>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-foreground">
                {roleLabel}: {counterpart.name}
              </span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-foreground">
                {booking.scheduledAt
                  ? formatSkillDateTime(booking.scheduledAt)
                  : tReservations("dateUndecided")}
              </span>
            </div>

            <div className="flex justify-between gap-2 border-t pt-2">
              <dt className="text-muted-foreground">{t("price")}</dt>
              <dd className="text-right font-medium">
                ¥{booking.skillListing.price.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("duration")}</dt>
              <dd className="text-right font-medium">
                {t("durationValue", { minutes: booking.skillListing.durationMinutes })}
              </dd>
            </div>
            {booking.message && (
              <div className="space-y-1 border-t pt-2">
                <dt className="text-muted-foreground">{t("message")}</dt>
                <dd className="rounded bg-muted p-2 text-sm whitespace-pre-wrap">
                  {booking.message}
                </dd>
              </div>
            )}
          </dl>

          <Button asChild variant="outline" className="w-full">
            <Link href={`/skills/bookings/${booking.id}`}>{t("viewDetail")}</Link>
          </Button>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
