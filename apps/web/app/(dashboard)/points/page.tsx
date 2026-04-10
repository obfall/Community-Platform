"use client";

import Link from "next/link";
import { usePointSummary, usePointHistory } from "@/hooks/points/use-points";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, TrendingDown, Clock } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  admin_grant: "管理者付与",
  rule_grant: "自動付与",
  utilization: "利用",
  event_grant: "イベント付与",
  expiry: "失効",
  admin_adjust: "管理者調整",
};

export default function PointsPage() {
  const { data: summary, isLoading: summaryLoading } = usePointSummary();
  const { data: historyData, isLoading: historyLoading } = usePointHistory({ limit: 10 });

  if (summaryLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ポイント</h1>
        <Link href="/points/history">
          <Button variant="outline">履歴を見る</Button>
        </Link>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">利用可能ポイント</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.availablePoints.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">累計獲得</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalGranted.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">累計利用</CardTitle>
              <TrendingDown className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUtilized.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">累計失効</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalExpired.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>最近の履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="py-4 text-center text-muted-foreground">読み込み中...</div>
          ) : !historyData?.data.length ? (
            <div className="py-4 text-center text-muted-foreground">ポイント履歴がありません</div>
          ) : (
            <div className="space-y-3">
              {historyData.data.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={h.points > 0 ? "default" : "secondary"} className="text-xs">
                        {TYPE_LABELS[h.type] ?? h.type}
                      </Badge>
                      {h.description && (
                        <span className="text-sm text-muted-foreground">{h.description}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <span
                    className={`text-lg font-bold ${h.points > 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {h.points > 0 ? "+" : ""}
                    {h.points.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
