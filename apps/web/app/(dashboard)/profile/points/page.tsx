"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

// NOTE: ポイント機能は仕様未確定のため、一旦「準備中」表示にしている。
// 仕様確定後、下部にコメントアウトで残した元実装を復活させること。
export default function ProfilePointsPage() {
  const t = useTranslations("profile");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("points.title")}</h2>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Star className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">準備中です</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ===== 仕様確定までコメントアウト（元実装） =====
import { useTranslations } from "next-intl";
import { usePointSummary, usePointHistory } from "@/hooks/points/use-points";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { PointHistory } from "@/lib/api/types";

export default function ProfilePointsPage() {
  const t = useTranslations("profile");
  const { data: pointSummary } = usePointSummary();
  const { data: pointHistory } = usePointHistory({ limit: 20 });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t("points.title")}</h2>

      {/* サマリー *\/}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("points.available")}</p>
            <p className="text-2xl font-bold">
              {pointSummary?.availablePoints?.toLocaleString() ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("points.totalGranted")}</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {pointSummary?.totalGranted?.toLocaleString() ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("points.totalUtilized")}</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {pointSummary?.totalUtilized?.toLocaleString() ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 履歴 *\/}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            {t("points.historyTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pointHistory?.data || pointHistory.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("points.empty")}</p>
          ) : (
            <div className="space-y-2">
              {pointHistory.data.map((item: PointHistory) => (
                <div key={item.id} className="flex items-center justify-between rounded-md p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{item.description ?? item.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${item.points > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {item.points > 0 ? "+" : ""}
                    {item.points.toLocaleString()}
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
===== 元実装ここまで ===== */
