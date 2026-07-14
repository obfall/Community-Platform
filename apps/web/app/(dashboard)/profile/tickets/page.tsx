"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useMyTickets } from "@/hooks/profile/use-tickets";
import { useCancelParticipation } from "@/hooks/events/use-events";
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
import { SelectField } from "@/components/select-field";
import { Ticket, CalendarDays, MapPin, Monitor } from "lucide-react";
import type { MyTicketItem } from "@/lib/api/types";

const STATUS_OPTIONS = ["applied", "attended", "no_show"] as const;

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "secondary",
  confirmed: "default",
  attended: "outline",
  no_show: "destructive",
};

const CANCELABLE_STATUSES = ["applied", "confirmed"];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfileTicketsPage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("profile.tickets.status");
  const [status, setStatus] = useState("all");
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyTickets(
    status === "all" ? undefined : status,
  );
  const [selected, setSelected] = useState<MyTicketItem | null>(null);

  const tickets = data?.pages.flatMap((p) => p.data) ?? [];
  const statusOptions = STATUS_OPTIONS.map((s) => ({ value: s, label: tStatus(s) }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("tickets.title")}</h2>

      <SelectField
        value={status}
        onChange={setStatus}
        options={statusOptions}
        includeAll
        className="w-44"
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{tCommon("loading")}</div>
      ) : tickets.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Ticket className="mx-auto mb-4 h-12 w-12" />
          <p>{t("tickets.empty")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tickets.map((item: MyTicketItem) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="w-full text-left"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.event.title}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          {formatDateTime(item.event.startAt)}
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

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? tCommon("loading") : tCommon("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}

      <TicketDetailDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TicketDetailDialog({ item, onClose }: { item: MyTicketItem | null; onClose: () => void }) {
  const t = useTranslations("profile.tickets.detail");
  const tStatus = useTranslations("profile.tickets.status");
  const queryClient = useQueryClient();
  const cancelParticipation = useCancelParticipation();

  if (!item) return null;

  const canCancel = CANCELABLE_STATUSES.includes(item.status);

  const handleCancel = () => {
    cancelParticipation.mutate(item.event.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["my", "tickets"] });
        onClose();
      },
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{item.event.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold">{item.event.title}</p>
            <Badge variant={STATUS_VARIANTS[item.status] ?? "secondary"} className="mt-1 text-xs">
              {tStatus.has(item.status) ? tStatus(item.status) : item.status}
            </Badge>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-foreground">{formatDateTime(item.event.startAt)}</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              {item.event.locationType === "online" ? (
                <Monitor className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="text-foreground">
                {item.event.venueName ?? item.event.locationType}
              </span>
            </div>

            {item.ticket && (
              <div className="flex justify-between gap-2 border-t pt-2">
                <dt className="text-muted-foreground">{t("ticketName")}</dt>
                <dd className="text-right font-medium">{item.ticket.ticketName}</dd>
              </div>
            )}
            {item.ticket && item.ticket.price > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("price")}</dt>
                <dd className="text-right font-medium">
                  ¥{item.ticket.price.toLocaleString()} x {item.quantity}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("quantity")}</dt>
              <dd className="text-right font-medium">{item.quantity}</dd>
            </div>
            {item.paymentStatus && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("paymentStatus")}</dt>
                <dd className="text-right font-medium">{item.paymentStatus}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("appliedAt")}</dt>
              <dd className="text-right font-medium">{formatDateTime(item.appliedAt)}</dd>
            </div>
          </dl>

          <Button asChild variant="outline" className="w-full">
            <Link href={`/events/${item.event.id}`}>{t("viewEvent")}</Link>
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={cancelParticipation.isPending}>
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
