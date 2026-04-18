"use client";

import Link from "next/link";
import { usePendingSurveys } from "@/hooks/surveys/use-surveys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowRight, CalendarDays } from "lucide-react";

function estimateMinutes(questionCount: number) {
  return Math.max(1, Math.ceil(questionCount * 0.4));
}

export function PendingSurveysWidget() {
  const { data: surveys, isLoading } = usePendingSurveys();

  if (isLoading) return null;
  if (!surveys || surveys.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          未回答のアンケート
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {surveys.slice(0, 3).map((s) => {
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
        {surveys.length > 3 && (
          <div className="mt-2 text-right">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                他 {surveys.length - 3} 件 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
