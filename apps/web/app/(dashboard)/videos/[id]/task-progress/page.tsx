"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVideoTaskProgress, useSendTaskReminder } from "@/hooks/videos/use-videos";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Bell, CheckCircle, Clock, Circle, Loader2 } from "lucide-react";

export default function TaskProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const t = useTranslations("videos.taskProgress");
  const { data: progress, isLoading } = useVideoTaskProgress(id);
  const sendReminder = useSendTaskReminder();

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  if (!isAdmin) {
    return <div className="py-12 text-center text-muted-foreground">{t("forbidden")}</div>;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;
  }

  if (!progress) {
    return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/videos/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{progress.videoTitle}</p>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {t("totalMembersLabel", { count: progress.totalMembers })}
      </div>

      {progress.tasks.map((task) => (
        <TaskProgressCard
          key={task.id}
          videoId={id}
          task={task}
          totalMembers={progress.totalMembers}
          sendReminder={sendReminder}
        />
      ))}
    </div>
  );
}

type MemberRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: "completed" | "in_progress" | "not_started";
  statusUpdatedAt: string | null;
  completedAt: string | null;
};

type TaskData = {
  id: string;
  title: string;
  description: string | null;
  completionCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completedBy: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    statusUpdatedAt: string;
    completedAt: string | null;
  }[];
  inProgressBy: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    statusUpdatedAt: string;
  }[];
  notStartedBy: {
    userId: string;
    name: string;
    avatarUrl: string | null;
  }[];
};

function statusBadgeVariant(s: MemberRow["status"]): "default" | "secondary" | "outline" {
  if (s === "completed") return "default";
  if (s === "in_progress") return "secondary";
  return "outline";
}

function TaskProgressCard({
  videoId,
  task,
  totalMembers,
  sendReminder,
}: {
  videoId: string;
  task: TaskData;
  totalMembers: number;
  sendReminder: ReturnType<typeof useSendTaskReminder>;
}) {
  const t = useTranslations("videos.taskProgress");
  const tTaskStatus = useTranslations("enums.videoTaskStatus");
  const completionRate =
    totalMembers > 0 ? Math.round((task.completionCount / totalMembers) * 100) : 0;

  const incompleteCount = task.inProgressCount + task.notStartedCount;

  // 統合: 全メンバーを1つの表に（完了→進行中→未着手の順）
  const allRows: MemberRow[] = [
    ...task.completedBy.map(
      (c): MemberRow => ({
        userId: c.userId,
        name: c.name,
        avatarUrl: c.avatarUrl,
        status: "completed",
        statusUpdatedAt: c.statusUpdatedAt,
        completedAt: c.completedAt,
      }),
    ),
    ...task.inProgressBy.map(
      (c): MemberRow => ({
        userId: c.userId,
        name: c.name,
        avatarUrl: c.avatarUrl,
        status: "in_progress",
        statusUpdatedAt: c.statusUpdatedAt,
        completedAt: null,
      }),
    ),
    ...task.notStartedBy.map(
      (c): MemberRow => ({
        userId: c.userId,
        name: c.name,
        avatarUrl: c.avatarUrl,
        status: "not_started",
        statusUpdatedAt: null,
        completedAt: null,
      }),
    ),
  ];

  const handleRemindAll = () => {
    sendReminder.mutate({ videoId, taskId: task.id, userIds: [] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{task.title}</span>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {t("completedBadge", { count: task.completionCount })}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {t("inProgressBadge", { count: task.inProgressCount })}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Circle className="h-3 w-3" />
              {t("notStartedBadge", { count: task.notStartedCount })}
            </Badge>
          </div>
        </CardTitle>
        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 進捗バー */}
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            {t("completionRateLabel", { rate: completionRate })}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* メンバー進捗表 */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.member")}</TableHead>
                <TableHead className="w-28">{t("table.status")}</TableHead>
                <TableHead className="w-40">{t("table.updatedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{row.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.status)} className="text-[10px]">
                      {tTaskStatus(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.status === "completed" && row.completedAt ? (
                      <>
                        {t("table.completedAt", {
                          date: new Date(row.completedAt).toLocaleDateString("ja-JP"),
                        })}
                      </>
                    ) : row.statusUpdatedAt ? (
                      <>
                        {t("table.updatedAtValue", {
                          date: new Date(row.statusUpdatedAt).toLocaleDateString("ja-JP"),
                        })}
                      </>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* リマインド */}
        {incompleteCount > 0 && (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">
              {t("incompleteSummary", { count: incompleteCount })}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemindAll}
              disabled={sendReminder.isPending}
            >
              {sendReminder.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Bell className="mr-1 h-4 w-4" />
              )}
              {t("remindAllAction")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
