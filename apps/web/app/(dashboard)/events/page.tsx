"use client";

import { useState } from "react";
import Link from "next/link";
import { useEvents } from "@/hooks/use-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CalendarDays, MapPin, Monitor, Users } from "lucide-react";
import type { EventListItem, EventQuery } from "@/lib/api/types";

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
  const [query, setQuery] = useState<EventQuery>({ page: 1, limit: 12 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useEvents(query);

  const events = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">イベント</h1>
        <div className="flex gap-2">
          <Link href="/events/calendar">
            <Button variant="outline">
              <CalendarDays className="mr-2 h-4 w-4" />
              カレンダー
            </Button>
          </Link>
          <Link href="/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="イベントを検索..."
            className="max-w-sm"
          />
          <Button variant="outline" onClick={handleSearch}>
            検索
          </Button>
        </div>
        <Select
          value={query.status ?? "all"}
          onValueChange={(v) =>
            setQuery((prev) => ({ ...prev, status: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="recruiting">募集中</SelectItem>
            <SelectItem value="closed">締切</SelectItem>
            <SelectItem value="ended">終了</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* イベント一覧 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-4 h-12 w-12" />
          <p>イベントがありません</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: EventListItem) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                {event.coverImageUrl && (
                  <div className="h-40 overflow-hidden rounded-t-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.coverImageUrl}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[event.status] ?? "secondary"}>
                      {STATUS_LABELS[event.status] ?? event.status}
                    </Badge>
                    {event.category && <Badge variant="outline">{event.category.name}</Badge>}
                  </div>
                  <h3 className="mb-2 line-clamp-2 text-sm font-semibold">{event.title}</h3>
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
                      {event.venueName ?? event.locationType}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.participantCount}
                      {event.totalCapacity !== null ? `/${event.totalCapacity}人` : "人参加"}
                      {event.minPrice !== null && (
                        <span className="ml-auto font-medium text-foreground">
                          ¥{event.minPrice.toLocaleString()}〜
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
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setQuery((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))
            }
            disabled={!meta.hasPreviousPage}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
            disabled={!meta.hasNextPage}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
