"use client";

import { use } from "react";
import { SurveyDetailView } from "@/components/surveys/survey-detail-view";

export default function EventSurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string; surveyId: string }>;
}) {
  const { id: eventId, surveyId } = use(params);

  return (
    <SurveyDetailView
      surveyId={surveyId}
      backHref={`/events/${eventId}/survey`}
      resultsHref={`/events/${eventId}/survey/${surveyId}/results`}
    />
  );
}
