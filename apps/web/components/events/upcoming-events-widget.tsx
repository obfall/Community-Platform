"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useUpcomingEvents } from "@/hooks/events/use-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight, MapPin, Clock } from "lucide-react";

const ITEMS_COUNT = 3;

export function UpcomingEventsWidget() {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard.upcomingEvents");
  const { data: upcomingEvents = [], isLoading } = useUpcomingEvents(ITEMS_COUNT);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/events">
            {tCommon("seeAll")} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="block rounded-md p-2 hover:bg-accent">
                  <p className="font-medium">{e.title}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(e.startAt)}
                    </span>
                    {e.venueName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {e.venueName}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
