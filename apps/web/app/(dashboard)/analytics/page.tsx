"use client";

import { useState } from "react";
import { useAnalyticsDashboard, useEngagementRanking } from "@/hooks/analytics/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, CalendarDays, Video, TrendingUp, BarChart3, CalendarCheck } from "lucide-react";
import type { EngagementScoreItem } from "@/lib/api/types";
import { EventParticipationTab } from "./_components/event-participation-tab";

export default function AnalyticsPage() {
  const { data: dashboard, isLoading } = useAnalyticsDashboard();
  const [engagementPage] = useState(1);
  const { data: engagementData } = useEngagementRanking({ page: engagementPage, limit: 20 });

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;

  const summary = dashboard?.summary;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">アナリティクス</h1>

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{summary?.totalMembers ?? 0}</p>
              <p className="text-xs text-muted-foreground">総メンバー数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{summary?.activeMembers ?? 0}</p>
              <p className="text-xs text-muted-foreground">アクティブ（30日）</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarDays className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{summary?.totalEvents ?? 0}</p>
              <p className="text-xs text-muted-foreground">イベント数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarCheck className="h-5 w-5 text-pink-500" />
            <div>
              <p className="text-2xl font-bold">{summary?.recentAttendedCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">参加延べ（30日）</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Video className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{summary?.totalVideos ?? 0}</p>
              <p className="text-xs text-muted-foreground">公開動画数</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* タブ */}
      <Tabs defaultValue="event-participation">
        <TabsList>
          <TabsTrigger value="event-participation">イベント参加</TabsTrigger>
          <TabsTrigger value="engagement">エンゲージメント</TabsTrigger>
          <TabsTrigger value="trends">推移</TabsTrigger>
        </TabsList>

        <TabsContent value="event-participation" className="pt-4">
          <EventParticipationTab />
        </TabsContent>

        <TabsContent value="engagement" className="pt-4">
          {!engagementData?.data?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">データがありません</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>順位</TableHead>
                  <TableHead>メンバー</TableHead>
                  <TableHead className="text-right">総合</TableHead>
                  <TableHead className="text-right">ログイン</TableHead>
                  <TableHead className="text-right">投稿</TableHead>
                  <TableHead className="text-right">イベント</TableHead>
                  <TableHead className="text-right">動画</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagementData.data.map((s: EngagementScoreItem, i: number) => (
                  <TableRow key={s.userId}>
                    <TableCell>
                      <Badge variant={i < 3 ? "default" : "outline"}>
                        {(engagementPage - 1) * 20 + i + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{s.user.name}</TableCell>
                    <TableCell className="text-right font-bold">{s.score.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{s.loginFrequencyScore.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{s.postFrequencyScore.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {s.eventParticipationScore.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">{s.videoWatchScore.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="trends" className="pt-4">
          {!dashboard?.snapshots?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              スナップショットデータがありません
            </p>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    日次推移（直近30日）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日付</TableHead>
                        <TableHead className="text-right">総会員</TableHead>
                        <TableHead className="text-right">アクティブ</TableHead>
                        <TableHead className="text-right">新規</TableHead>
                        <TableHead className="text-right">投稿</TableHead>
                        <TableHead className="text-right">イベント</TableHead>
                        <TableHead className="text-right">動画視聴</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.snapshots.slice(0, 14).map((s) => (
                        <TableRow key={s.snapshotDate}>
                          <TableCell className="text-sm">
                            {new Date(s.snapshotDate).toLocaleDateString("ja-JP")}
                          </TableCell>
                          <TableCell className="text-right">{s.totalMembers}</TableCell>
                          <TableCell className="text-right">{s.activeMembers}</TableCell>
                          <TableCell className="text-right">{s.newMembers}</TableCell>
                          <TableCell className="text-right">{s.totalPosts}</TableCell>
                          <TableCell className="text-right">{s.totalEvents}</TableCell>
                          <TableCell className="text-right">{s.totalVideoViews}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
