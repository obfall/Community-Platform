"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEvents } from "@/hooks/events/use-events";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/select-field";
import { HighlightedText } from "@/components/highlighted-text";
import { Plus, MapPin, Monitor, Users, CalendarDays } from "lucide-react";
import type { EventListItem, EventQuery } from "@/lib/api/types";
import { EVENT_STATUS_VARIANTS, EVENT_STATUS_FILTER_VALUES } from "@/lib/events/event-status";

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  venue: <MapPin className="h-3 w-3" />,
  online: <Monitor className="h-3 w-3" />,
  hybrid: (
    <>
      <MapPin className="h-3 w-3" />
      <Monitor className="h-3 w-3" />
    </>
  ),
};

export default function EventsPage() {
  const t = useTranslations("events.list");
  const tStatus = useTranslations("enums.eventStatus");
  const tLocation = useTranslations("enums.eventLocationType");
  const { user } = useAuth();
  const [query, setQuery] = useState<EventQuery>({ page: 1, limit: 12 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useEvents(query);
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const events = data?.data ?? [];
  const meta = data?.meta;

  const filterOptions = EVENT_STATUS_FILTER_VALUES.map((value) => ({
    value,
    label: tStatus(value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href="/events/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("create")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* フィルタ。ステータスフィルタは admin / owner のみ（非管理者は recruiting で API 側強制） */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={(v) => setQuery((prev) => ({ ...prev, search: v || undefined, page: 1 }))}
          placeholder={t("searchPlaceholder")}
        />
        {isAdmin && (
          <SelectField
            value={query.status ?? "all"}
            onChange={(v) =>
              setQuery((prev) => ({ ...prev, status: v === "all" ? undefined : v, page: 1 }))
            }
            options={filterOptions}
            includeAll
            placeholder={t("filterPlaceholder")}
            className="w-32"
          />
        )}
      </div>

      {/* イベント一覧 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-4 h-12 w-12" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: EventListItem) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                {event.coverImageUrl ? (
                  <div className="relative h-40 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.coverImageUrl}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                    <Badge
                      variant={EVENT_STATUS_VARIANTS[event.status] ?? "secondary"}
                      className="absolute top-2 left-2 shadow"
                    >
                      {tStatus(event.status)}
                    </Badge>
                  </div>
                ) : null}
                <CardContent className="p-4">
                  {!event.coverImageUrl && (
                    <div className="mb-2">
                      <Badge variant={EVENT_STATUS_VARIANTS[event.status] ?? "secondary"}>
                        {tStatus(event.status)}
                      </Badge>
                    </div>
                  )}
                  <h3 className="mb-2 line-clamp-2 text-sm font-semibold">
                    <HighlightedText html={event.titleHighlighted} fallback={event.title} />
                  </h3>
                  {event.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {event.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(event.startAt).toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      {LOCATION_ICONS[event.locationType]}
                      {event.venueName ?? tLocation(event.locationType)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.totalCapacity !== null
                        ? t("participantsLabel", {
                            count: event.participantCount,
                            total: event.totalCapacity,
                          })
                        : t("participantsLabelOpen", { count: event.participantCount })}
                      {event.minPrice !== null && (
                        <span className="ml-auto font-medium text-foreground">
                          {t("priceLabel", { price: event.minPrice.toLocaleString() })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {meta && (
        <PaginationBar
          meta={meta}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  );
}
