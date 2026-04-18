"use client";

import { use } from "react";
import { useSurveyResults } from "@/hooks/surveys/use-surveys";
import { SurveyResultsView } from "@/components/surveys/survey-results-view";

export default function EventSurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string; surveyId: string }>;
}) {
  const { id: eventId, surveyId } = use(params);
  const { data, isLoading } = useSurveyResults(surveyId);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!data)
    return <div className="py-12 text-center text-muted-foreground">結果が見つかりません</div>;

  return <SurveyResultsView data={data} backHref={`/events/${eventId}/survey`} />;
}
