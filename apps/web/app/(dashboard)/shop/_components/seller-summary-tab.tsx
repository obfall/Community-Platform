"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSellerSummary } from "@/hooks/shop/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 販売者（＝現在のユーザー）の売上サマリー。manage（owner+）と seller（出品 member）で共用。
export function SellerSummaryTab() {
  const t = useTranslations("shop.manage");
  const tStatus = useTranslations("shop.orderStatus");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: summary, isLoading } = useSellerSummary({
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>{t("summaryFrom")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>{t("summaryTo")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            {t("summaryClear")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t("summaryRevenue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{(summary?.totalRevenue ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("summaryOrderCount")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.orderCount ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t("summaryByStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{tStatus("in_progress")}</span>
                <span className="font-semibold">{summary?.inProgressCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{tStatus("in_negotiation")}</span>
                <span className="font-semibold">{summary?.inNegotiationCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{tStatus("completed")}</span>
                <span className="font-semibold">{summary?.completedCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{tStatus("canceled")}</span>
                <span className="font-semibold">{summary?.canceledCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
