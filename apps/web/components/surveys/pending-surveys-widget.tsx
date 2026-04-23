"use client";

import { useState } from "react";
import Link from "next/link";
import { usePendingSurveys } from "@/hooks/surveys/use-surveys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

const COLLAPSED_COUNT = 3;

function estimateMinutes(questionCount: number) {
  return Math.max(1, Math.ceil(questionCount * 0.4));
}

export function PendingSurveysWidget() {
  const { data: surveys, isLoading } = usePendingSurveys();
  const [expanded, setExpanded] = useState(false);

  const items = surveys ?? [];
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hiddenCount = items.length - COLLAPSED_COUNT;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          未回答のアンケート
          {items.length > 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">({items.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">未回答のアンケートはありません</p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((s) => {
                const href = s.eventId
                  ? `/events/${s.eventId}/survey/${s.id}/respond`
                  : `/surveys/${s.id}/respond`;
                return (
                  <li key={s.id}>
                    <Link href={href} className="block rounded-md p-2 hover:bg-accent">
                      <p className="font-medium">{s.title}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          {s.questionCount}問・約{estimateMinutes(s.questionCount)}分
                        </span>
                        {s.eventTitle && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {s.eventTitle}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {hiddenCount > 0 && (
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      折りたたむ
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />他 {hiddenCount} 件を表示
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
