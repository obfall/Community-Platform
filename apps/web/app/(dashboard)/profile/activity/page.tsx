"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMemberEvents, useMemberProjects } from "@/hooks/members/use-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, FolderKanban, Users } from "lucide-react";
import type { UserEventItem, UserProjectItem } from "@/lib/api/types";
import { PROJECT_STATUS_VARIANTS } from "@/lib/projects/project-status";

const EVENT_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  recruiting: "default",
  closed: "outline",
  canceled: "destructive",
  ended: "outline",
  draft: "secondary",
};

export default function ProfileActivityPage() {
  const t = useTranslations("profile");
  const tEventStatus = useTranslations("enums.eventStatus");
  const tProjectStatus = useTranslations("enums.projectStatus");
  const { user } = useAuth();
  const { data: events } = useMemberEvents(user?.id);
  const { data: projects } = useMemberProjects(user?.id);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("activity.title")}</h2>

      {/* サマリー */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{events?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t("activity.eventsLabel")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{projects?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t("activity.projectsLabel")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* イベント */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {t("activity.eventsLabel")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!events || events.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("activity.noEvents")}
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((event: UserEventItem) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
                >
                  <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.startAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={EVENT_STATUS_VARIANTS[event.status] ?? "secondary"}
                    className="text-xs"
                  >
                    {tEventStatus.has(event.status) ? tEventStatus(event.status) : event.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* プロジェクト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            {t("activity.projectsLabel")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!projects || projects.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("activity.noProjects")}
            </p>
          ) : (
            <div className="space-y-2">
              {projects.map((project: UserProjectItem) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
                >
                  <FolderKanban className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    {project.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {project.memberCount}
                  </span>
                  <Badge
                    variant={PROJECT_STATUS_VARIANTS[project.status] ?? "secondary"}
                    className="text-xs"
                  >
                    {tProjectStatus.has(project.status)
                      ? tProjectStatus(project.status)
                      : project.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
