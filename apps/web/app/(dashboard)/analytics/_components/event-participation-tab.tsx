"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useParticipationDistribution,
  useMonthlyParticipationTrend,
  useEventRanking,
  useDropoutRisk,
} from "@/hooks/analytics/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP");
}

function formatRate(v: number | null) {
  if (v === null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function DistributionSection() {
  const { data, isLoading } = useParticipationDistribution();
  if (isLoading)
    return <p className="py-6 text-center text-sm text-muted-foreground">読み込み中...</p>;
  if (!data) return null;

  const max = Math.max(...data.buckets.map((b) => b.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>参加回数の分布</CardTitle>
        <p className="text-xs text-muted-foreground">
          アクティブメンバー {data.totalActiveUsers} 人の参加回数内訳（キャンセル除く）
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.buckets.map((b) => {
            const pct = (b.count / max) * 100;
            const sharePct =
              data.totalActiveUsers > 0 ? (b.count / data.totalActiveUsers) * 100 : 0;
            return (
              <div key={b.bucket} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm font-medium">{b.label}</span>
                <div className="flex-1">
                  <div className="h-6 rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-28 shrink-0 text-right text-sm tabular-nums">
                  {b.count} 人（{sharePct.toFixed(1)}%）
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyTrendSection() {
  const { data, isLoading } = useMonthlyParticipationTrend({ months: 12 });
  if (isLoading)
    return <p className="py-6 text-center text-sm text-muted-foreground">読み込み中...</p>;
  if (!data) return null;

  const max = Math.max(...data.data.map((d) => d.totalParticipations), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>月次参加者推移（直近12ヶ月）</CardTitle>
        <p className="text-xs text-muted-foreground">ユニーク参加者数 / 延べ参加数（出席ベース）</p>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-end gap-2">
          {data.data.map((d) => {
            const totalPct = (d.totalParticipations / max) * 100;
            const uniquePct = (d.uniqueParticipants / max) * 100;
            return (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t bg-muted"
                    style={{ height: `${totalPct}%` }}
                    title={`延べ ${d.totalParticipations}`}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-full rounded-t bg-primary"
                    style={{ height: `${uniquePct}%` }}
                    title={`ユニーク ${d.uniqueParticipants}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {d.month.slice(2).replace("-", "/")}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded bg-primary" />
            ユニーク参加者
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded bg-muted" />
            延べ参加数
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EventRankingSection() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEventRanking({ page, limit: 20 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>イベント別ランキング</CardTitle>
        <p className="text-xs text-muted-foreground">開催日の新しい順</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">読み込み中...</p>
        ) : !data?.data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">データがありません</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>イベント名</TableHead>
                  <TableHead>開催日</TableHead>
                  <TableHead className="text-right">応募</TableHead>
                  <TableHead className="text-right">出席</TableHead>
                  <TableHead className="text-right">出席率</TableHead>
                  <TableHead className="text-right">キャンセル率</TableHead>
                  <TableHead className="text-right">リピーター率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((e) => (
                  <TableRow
                    key={e.eventId}
                    className="cursor-pointer"
                    onClick={() => router.push(`/events/${e.eventId}`)}
                  >
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>{formatDate(e.startAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.appliedCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.attendedCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(e.attendanceRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(e.cancellationRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(e.repeaterRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <PaginationBar meta={data.meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DropoutRiskSection() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDropoutRisk({ page, limit: 20, months: 3 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>離脱予兆</CardTitle>
        <p className="text-xs text-muted-foreground">
          過去に1回以上参加し、直近3ヶ月の出席がないメンバー
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">読み込み中...</p>
        ) : !data?.data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            該当するメンバーはいません
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>メンバー</TableHead>
                  <TableHead className="text-right">過去総参加回数</TableHead>
                  <TableHead>最終参加日</TableHead>
                  <TableHead className="text-right">経過日数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((m) => (
                  <TableRow
                    key={m.userId}
                    className="cursor-pointer"
                    onClick={() => router.push(`/members/${m.userId}`)}
                  >
                    <TableCell>
                      <p className="text-sm font-medium">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.totalAttended}</TableCell>
                    <TableCell>{formatDate(m.lastAttendedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.elapsedDays} 日</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <PaginationBar meta={data.meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function EventParticipationTab() {
  return (
    <div className="space-y-4">
      <DistributionSection />
      <MonthlyTrendSection />
      <EventRankingSection />
      <DropoutRiskSection />
    </div>
  );
}
