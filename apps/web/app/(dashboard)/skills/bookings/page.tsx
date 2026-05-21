"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSkillBookings } from "@/hooks/skills/use-skills";
import { useAuth } from "@/hooks/auth/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/select-field";
import { ArrowLeft, CalendarClock, History, Inbox, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SkillBooking, SkillBookingStatus } from "@/lib/api/types";

const STATUS_VALUES: SkillBookingStatus[] = [
  "requested",
  "approved",
  "rejected",
  "completed",
  "canceled",
];

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

const isActiveBooking = (b: SkillBooking) => b.status === "requested" || b.status === "approved";

type TabValue = "received" | "sent" | "history";

export default function SkillBookingsPage() {
  const t = useTranslations("skills");
  const tBookings = useTranslations("skills.bookings");
  const tStatus = useTranslations("skills.bookingStatus");
  const { user } = useAuth();
  const { data: bookings, isLoading } = useSkillBookings();
  const [tab, setTab] = useState<TabValue>("received");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusOptions = STATUS_VALUES.map((value) => ({ value, label: tStatus(value) }));

  const { received, sent, history } = useMemo(() => {
    const list = bookings ?? [];
    return {
      received: list.filter((b) => b.providerUserId === user?.id && isActiveBooking(b)),
      sent: list.filter((b) => b.requesterUserId === user?.id && isActiveBooking(b)),
      history: list,
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
        <h1 className="text-2xl font-bold">{t("heading.bookings")}</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="received" className="gap-1.5">
              <Inbox className="h-4 w-4" />
              {tBookings("tabs.received")}
              {received.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {received.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1.5">
              <Send className="h-4 w-4" />
              {tBookings("tabs.sent")}
              {sent.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {sent.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-4 w-4" />
              {tBookings("tabs.history")}
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {history.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {tab === "history" && (
            <SelectField
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              includeAll
              placeholder={tBookings("statusPlaceholder")}
              className="w-40"
            />
          )}
        </div>

        <TabsContent value="received" className="mt-4">
          <BookingList
            list={received}
            isLoading={isLoading}
            role="provider"
            emptyText={tBookings("empty.received")}
          />
        </TabsContent>
        <TabsContent value="sent" className="mt-4">
          <BookingList
            list={sent}
            isLoading={isLoading}
            role="requester"
            emptyText={tBookings("empty.sent")}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <BookingList
            list={filterByStatus(history)}
            isLoading={isLoading}
            role="history"
            emptyText={tBookings("empty.history")}
            currentUserId={user?.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingList({
  list,
  isLoading,
  role,
  emptyText,
  currentUserId,
}: {
  list: SkillBooking[];
  isLoading: boolean;
  role: "provider" | "requester" | "history";
  emptyText: string;
  currentUserId?: string;
}) {
  const tBookings = useTranslations("skills.bookings");
  const tStatus = useTranslations("skills.bookingStatus");

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{tBookings("loading")}</div>;
  }
  if (list.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">{emptyText}</div>;
  }

  const renderParties = (b: SkillBooking) => {
    if (role === "provider") {
      return tBookings("counterpart", { role: tBookings("requester"), name: b.requester.name });
    }
    if (role === "requester") {
      return tBookings("counterpart", { role: tBookings("provider"), name: b.provider.name });
    }
    // history: 自分が当事者なら相手だけ、それ以外（admin が他人の予約を見る場合）は両方表示
    if (currentUserId === b.providerUserId) {
      return tBookings("counterpart", { role: tBookings("requester"), name: b.requester.name });
    }
    if (currentUserId === b.requesterUserId) {
      return tBookings("counterpart", { role: tBookings("provider"), name: b.provider.name });
    }
    return tBookings("providerRequester", {
      provider: b.provider.name,
      requester: b.requester.name,
    });
  };

  return (
    <div className="space-y-3">
      {list.map((b) => {
        return (
          <Link key={b.id} href={`/skills/bookings/${b.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{b.skillListing.title}</h3>
                  <Badge variant={STATUS_VARIANT[b.status]}>{tStatus(b.status)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{renderParties(b)}</div>
                {b.scheduledAt && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {tBookings("scheduledAt", {
                      datetime: new Date(b.scheduledAt).toLocaleString("ja-JP"),
                    })}
                  </div>
                )}
                {b.message && (
                  <div className="mt-2 line-clamp-2 rounded bg-muted px-2 py-1 text-xs">
                    {b.message}
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  {tBookings("createdAt", {
                    datetime: new Date(b.createdAt).toLocaleString("ja-JP"),
                  })}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
