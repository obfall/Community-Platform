"use client";

import { use } from "react";
import Link from "next/link";
import { useEvent, useParticipantStats } from "@/hooks/events/use-events";
import { useAuth } from "@/hooks/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, XCircle } from "lucide-react";

const GENDER_LABELS: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  prefer_not_to_say: "回答しない",
};

const BASIC_ATTRIBUTE_LABELS: Record<string, string> = {
  gender: "性別",
  ageBands: "年齢層",
  occupation: "職業",
  affiliation: "所属",
  nationality: "国籍",
};

function StatBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {count}件 ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EventStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: event } = useEvent(id);
  const { data: stats, isLoading } = useParticipantStats(id);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  if (!isAdmin) {
    return <div className="py-12 text-center text-muted-foreground">アクセス権限がありません</div>;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (!stats || !event) {
    return <div className="py-12 text-center text-muted-foreground">データが見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href={`/events/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">参加者統計</h1>
          <p className="text-sm text-muted-foreground">{event.title}</p>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
              <p className="text-xs text-muted-foreground">参加者（有効）</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.canceledTotal}</p>
              <p className="text-xs text-muted-foreground">キャンセル済み</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 基本属性セクション */}
      {Object.entries(stats.basicAttributes).map(([key, attr]) => {
        if (attr.answered === 0) return null;
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base">
                {BASIC_ATTRIBUTE_LABELS[key] ?? key}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({attr.answered}件の回答)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attr.values.map((v) => (
                <StatBar
                  key={v.key}
                  label={
                    key === "gender"
                      ? (GENDER_LABELS[v.key] ?? v.key)
                      : v.key === "other"
                        ? "その他"
                        : v.key
                  }
                  count={v.count}
                  total={attr.answered}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* カスタム質問セクション */}
      {stats.questions.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">カスタム質問</h2>
          {stats.questions.map((q) => (
            <Card key={q.questionId}>
              <CardHeader>
                <CardTitle className="text-base">
                  {q.label}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({q.answered}件の回答)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {q.optionCounts ? (
                  <div className="space-y-2">
                    {q.optionCounts.map((o) => (
                      <StatBar key={o.value} label={o.label} count={o.count} total={q.answered} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{q.answered}件のテキスト回答</p>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
