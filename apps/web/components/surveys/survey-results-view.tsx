"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import type { SurveyResults } from "@/lib/api/types";

interface SurveyResultsViewProps {
  data: SurveyResults;
  backHref?: string;
  pageTitle?: string;
}

export function SurveyResultsView({ data, backHref, pageTitle }: SurveyResultsViewProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {backHref && (
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{pageTitle ?? data.survey.title}</h1>
            <p className="text-sm text-muted-foreground">回答数: {data.survey.responseCount}</p>
          </div>
        </div>
      )}

      {!backHref && (
        <div>
          <h2 className="text-xl font-bold">{pageTitle ?? data.survey.title}</h2>
          <p className="text-sm text-muted-foreground">回答数: {data.survey.responseCount}</p>
        </div>
      )}

      {data.results.map((r, idx) => (
        <Card key={r.question.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {idx + 1}. {r.question.questionText}
              <Badge variant="secondary" className="ml-2 text-xs">
                {r.totalAnswers}件
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.optionCounts && r.question.options && (
              <div className="space-y-2">
                {r.question.options.map((o, oIdx) => {
                  const count =
                    r.optionCounts![o.value] ??
                    r.optionCounts![`opt_${oIdx}`] ??
                    r.optionCounts![`${oIdx}`] ??
                    0;
                  const pct = r.totalAnswers > 0 ? Math.round((count / r.totalAnswers) * 100) : 0;
                  return (
                    <div key={`${o.value}-${oIdx}`}>
                      <div className="flex justify-between text-sm">
                        <span>{o.label}</span>
                        <span className="text-muted-foreground">
                          {count}件 ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {r.average !== undefined && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {r.average != null ? r.average.toFixed(1) : "-"}
                  </div>
                  <div className="text-xs text-muted-foreground">平均</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{r.min ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">最小</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{r.max ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">最大</div>
                </div>
              </div>
            )}

            {r.textAnswers && (
              <div className="space-y-2">
                {r.textAnswers.map((t, i) => (
                  <div key={i} className="rounded border p-2 text-sm">
                    {t}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
