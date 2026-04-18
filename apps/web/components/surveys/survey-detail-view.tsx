"use client";

import Link from "next/link";
import {
  useSurveyRecipients,
  useSendReminder,
  useSendReminderToUser,
} from "@/hooks/surveys/use-surveys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Bell,
  BellRing,
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = { draft: "下書き", active: "受付中", closed: "終了" };
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  closed: "outline",
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SurveyDetailViewProps {
  surveyId: string;
  /** 戻るボタンのリンク先 */
  backHref: string;
  /** 結果ページのリンク先 */
  resultsHref: string;
}

export function SurveyDetailView({ surveyId, backHref, resultsHref }: SurveyDetailViewProps) {
  const { data, isLoading } = useSurveyRecipients(surveyId);
  const sendReminder = useSendReminder();
  const sendReminderToUser = useSendReminderToUser();

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!data)
    return (
      <div className="py-12 text-center text-muted-foreground">アンケートが見つかりません</div>
    );

  const { survey, recipients } = data;
  const respondedCount = recipients.filter((r) => r.responded).length;
  const unrepliedCount = recipients.filter((r) => !r.responded).length;
  const totalCount = recipients.length;
  const responseRate = totalCount > 0 ? Math.round((respondedCount / totalCount) * 100) : 0;
  const isActive = survey.status === "active";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{survey.title}</h1>
            <Badge variant={STATUS_VARIANT[survey.status] ?? "secondary"}>
              {STATUS_LABELS[survey.status] ?? survey.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={resultsHref}>
            <BarChart3 className="mr-2 h-4 w-4" />
            結果を見る
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Bell className="h-4 w-4" />
              初回通知
            </CardTitle>
          </CardHeader>
          <CardContent>
            {survey.notifiedAt ? (
              <p className="text-sm font-medium">{formatDateTime(survey.notifiedAt)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">未送信</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              回答状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {respondedCount} / {totalCount}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${responseRate}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{responseRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">送信先一覧</CardTitle>
          {isActive && unrepliedCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendReminder.mutate(surveyId)}
              disabled={sendReminder.isPending}
            >
              {sendReminder.isPending ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <BellRing className="mr-2 h-3 w-3" />
              )}
              未回答者全員にリマインド送信（{unrepliedCount}名）
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メンバー</TableHead>
                <TableHead>回答状況</TableHead>
                <TableHead>回答日時</TableHead>
                {isActive && <TableHead className="text-right">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={r.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">{r.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{r.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.responded ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        回答済み
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        未回答
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.respondedAt ? formatDateTime(r.respondedAt) : "-"}
                  </TableCell>
                  {isActive && (
                    <TableCell className="text-right">
                      {!r.responded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendReminderToUser.mutate({ surveyId, userId: r.userId })}
                          disabled={sendReminderToUser.isPending}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          個別送信
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
