"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/auth/use-auth";
import { PendingSurveysWidget } from "@/components/surveys/pending-surveys-widget";
import { AnnouncementsWidget } from "@/components/notifications/announcements-widget";
import { UpcomingScheduleWidget } from "@/components/calendar/upcoming-schedule-widget";
import { UpcomingEventsWidget } from "@/components/events/upcoming-events-widget";

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations("dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {user?.name ? t("welcomeWithName", { name: user.name }) : t("welcome")}
      </h1>

      <AnnouncementsWidget />

      <PendingSurveysWidget />

      <div className="grid gap-6 md:grid-cols-2">
        <UpcomingEventsWidget />
        <UpcomingScheduleWidget />
      </div>
    </div>
  );
}
