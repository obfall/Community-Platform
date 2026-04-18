"use client";

import { use } from "react";
import { SurveyDetailView } from "@/components/surveys/survey-detail-view";

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <SurveyDetailView surveyId={id} backHref="/surveys" resultsHref={`/surveys/${id}/results`} />
  );
}
