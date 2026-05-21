"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("venues.reservation");
  const tStatus = useTranslations("venues.reservationStatus");
  const { data: reservations, isLoading } = useVenueReservations(venueId);
  const cancelReservation = useCancelReservation();

  return (
    <div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : !reservations || reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableHeader.space")}</TableHead>
                <TableHead>{t("tableHeader.title")}</TableHead>
                <TableHead>{t("tableHeader.startAt")}</TableHead>
                <TableHead>{t("tableHeader.endAt")}</TableHead>
                <TableHead>{t("tableHeader.user")}</TableHead>
                <TableHead>{t("tableHeader.status")}</TableHead>
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
                      {tStatus.has(r.status) ? tStatus(r.status) : r.status}
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
                        {t("cancel")}
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
