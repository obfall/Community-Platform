"use client";

import { use } from "react";
import { useSurvey, useSubmitSurveyResponse } from "@/hooks/surveys/use-surveys";
import { SurveyResponseForm } from "@/components/surveys/survey-response-form";
import type { AnswerPayload } from "@/components/surveys/survey-response-form";

export default function EventSurveyRespondPage({
  params,
}: {
  params: Promise<{ id: string; surveyId: string }>;
}) {
  const { id: eventId, surveyId } = use(params);
  const { data: survey, isLoading } = useSurvey(surveyId);
  const submitResponse = useSubmitSurveyResponse();

  const handleSubmit = (answers: AnswerPayload[]) => {
    submitResponse.mutate({ surveyId, answers });
  };

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!survey)
    return (
      <div className="py-12 text-center text-muted-foreground">アンケートが見つかりません</div>
    );

  return (
    <SurveyResponseForm
      survey={survey}
      onSubmit={handleSubmit}
      isSubmitting={submitResponse.isPending}
      showCompleted
    />
  );
}
