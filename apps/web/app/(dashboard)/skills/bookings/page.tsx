"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSkillBookings } from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/select-field";
import { ArrowLeft, CalendarClock, Inbox, ListTodo, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SkillBooking, SkillBookingStatus } from "@/lib/api/types";

const STATUS_OPTIONS: { value: SkillBookingStatus; label: string }[] = [
  { value: "requested", label: "リクエスト中" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "拒否" },
  { value: "completed", label: "完了" },
  { value: "canceled", label: "キャンセル" },
];

const STATUS_LABEL: Record<SkillBookingStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
) as Record<SkillBookingStatus, string>;

const STATUS_VARIANT: Record<
  SkillBookingStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  requested: "secondary",
  approved: "default",
  rejected: "destructive",
  completed: "default",
  canceled: "outline",
};

export default function SkillBookingsPage() {
  const { user, isAdmin } = useAuth();
  const { data: bookings, isLoading } = useSkillBookings();
  const [tab, setTab] = useState<"received" | "sent" | "all">("received");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { received, sent, all } = useMemo(() => {
    const list = bookings ?? [];
    return {
      received: list.filter((b) => b.providerUserId === user?.id),
      sent: list.filter((b) => b.requesterUserId === user?.id),
      all: list,
    };
  }, [bookings, user?.id]);

  const filterByStatus = (list: SkillBooking[]) =>
    statusFilter === "all" ? list : list.filter((b) => b.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/skills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">予約一覧</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "received" | "sent" | "all")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="received" className="gap-1.5">
              <Inbox className="h-4 w-4" />
              受信した予約
              {received.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {received.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1.5">
              <Send className="h-4 w-4" />
              送った予約
              {sent.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {sent.length}
                </Badge>
              )}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="all" className="gap-1.5">
                <ListTodo className="h-4 w-4" />
                すべて
                {all.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {all.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            includeAll
            placeholder="ステータス"
            className="w-40"
          />
        </div>

        <TabsContent value="received" className="mt-4">
          <BookingList
            list={filterByStatus(received)}
            isLoading={isLoading}
            role="provider"
            emptyText="受信した予約はまだありません"
          />
        </TabsContent>
        <TabsContent value="sent" className="mt-4">
          <BookingList
            list={filterByStatus(sent)}
            isLoading={isLoading}
            role="requester"
            emptyText="送った予約はまだありません"
          />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="all" className="mt-4">
            <BookingList
              list={filterByStatus(all)}
              isLoading={isLoading}
              role="admin"
              emptyText="予約はまだありません"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function BookingList({
  list,
  isLoading,
  role,
  emptyText,
}: {
  list: SkillBooking[];
  isLoading: boolean;
  role: "provider" | "requester" | "admin";
  emptyText: string;
}) {
  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }
  if (list.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="space-y-3">
      {list.map((b) => {
        return (
          <Link key={b.id} href={`/skills/bookings/${b.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{b.skillListing.title}</h3>
                  <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {role === "admin" ? (
                    <>
                      提供者: {b.provider.name} / リクエスター: {b.requester.name}
                    </>
                  ) : (
                    <>
                      {role === "provider" ? "リクエスター" : "提供者"}:{" "}
                      {(role === "provider" ? b.requester : b.provider).name}
                    </>
                  )}
                </div>
                {b.scheduledAt && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    希望日時: {new Date(b.scheduledAt).toLocaleString("ja-JP")}
                  </div>
                )}
                {b.message && (
                  <div className="mt-2 line-clamp-2 rounded bg-muted px-2 py-1 text-xs">
                    {b.message}
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  作成: {new Date(b.createdAt).toLocaleString("ja-JP")}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
