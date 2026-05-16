"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSurvey, useUpdateSurvey } from "@/hooks/surveys/use-surveys";
import { SurveyFormBuilder } from "@/components/surveys/survey-form-builder";
import type { SurveyFormData } from "@/components/surveys/survey-form-builder";

export default function EventSurveyEditPage({
  params,
}: {
  params: Promise<{ id: string; surveyId: string }>;
}) {
  const { id: eventId, surveyId } = use(params);
  const { data: survey, isLoading } = useSurvey(surveyId);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!survey)
    return (
      <div className="py-12 text-center text-muted-foreground">アンケートが見つかりません</div>
    );

  return <EditForm survey={survey} eventId={eventId} surveyId={surveyId} />;
}

function EditForm({
  survey,
  eventId,
  surveyId,
}: {
  survey: {
    title: string;
    description: string | null;
    questions: Array<{
      id: string;
      questionType: string;
      questionText: string;
      isRequired: boolean;
      options: Array<{ value: string; label: string }> | null;
    }>;
  };
  eventId: string;
  surveyId: string;
}) {
  const router = useRouter();
  const updateSurvey = useUpdateSurvey();

  const handleSubmit = (data: SurveyFormData) => {
    updateSurvey.mutate(
      {
        id: surveyId,
        data: {
          title: data.title,
          description: data.description ?? null,
          questions: data.questions,
        },
      },
      { onSuccess: () => router.push(`/events/${eventId}/survey/${surveyId}`) },
    );
  };

  return (
    <SurveyFormBuilder
      initialData={survey}
      onSubmit={handleSubmit}
      isSubmitting={updateSurvey.isPending}
      submitLabel="保存"
      backHref={`/events/${eventId}/survey/${surveyId}`}
      pageTitle="イベントアンケート編集"
    />
  );
}
