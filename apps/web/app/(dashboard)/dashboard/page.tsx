"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/auth/use-auth";
import { useEvents } from "@/hooks/events/use-events";
import { useContents } from "@/hooks/content/use-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileText, ArrowRight, MapPin, Clock } from "lucide-react";
import { PendingSurveysWidget } from "@/components/surveys/pending-surveys-widget";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    limit: 3,
    status: "published",
  });
  const { data: contentsData, isLoading: contentsLoading } = useContents({
    limit: 3,
    publishStatus: "published",
  });

  const upcomingEvents = (eventsData?.data ?? eventsData ?? []) as Array<{
    id: string;
    title: string;
    startAt: string;
    venueName: string | null;
    locationType: string;
    status: string;
  }>;

  const recentContents = (contentsData?.data ?? contentsData ?? []) as Array<{
    id: string;
    name: string;
    contentType: string;
    createdAt: string;
  }>;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" });
  };

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

  const contentTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      article: "記事",
      document: "ドキュメント",
      page: "ページ",
    };
    return map[type] ?? type;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ようこそ{user?.name ? `、${user.name}さん` : ""}</h1>

      <PendingSurveysWidget />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 今後のイベント */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5" />
              今後のイベント
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events">
                すべて見る <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">予定されているイベントはありません</p>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.slice(0, 3).map((e) => (
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

        {/* 新着コンテンツ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              新着コンテンツ
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/content">
                すべて見る <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {contentsLoading ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : recentContents.length === 0 ? (
              <p className="text-sm text-muted-foreground">コンテンツはありません</p>
            ) : (
              <ul className="space-y-3">
                {recentContents.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/content/${c.id}`}
                      className="block rounded-md p-2 hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{c.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {contentTypeLabel(c.contentType)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
