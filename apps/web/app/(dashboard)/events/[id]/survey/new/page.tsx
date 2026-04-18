"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useCreateSurvey } from "@/hooks/surveys/use-surveys";
import { SurveyFormBuilder } from "@/components/surveys/survey-form-builder";
import type { SurveyFormData } from "@/components/surveys/survey-form-builder";

export default function EventSurveyNewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const createSurvey = useCreateSurvey();

  const handleSubmit = (data: SurveyFormData) => {
    createSurvey.mutate(
      {
        title: data.title,
        description: data.description,
        eventId,
        questions: data.questions,
      },
      { onSuccess: () => router.push(`/events/${eventId}/survey`) },
    );
  };

  return (
    <SurveyFormBuilder
      onSubmit={handleSubmit}
      isSubmitting={createSurvey.isPending}
      submitLabel="作成"
      backHref={`/events/${eventId}/survey`}
      pageTitle="イベントアンケート作成"
    />
  );
}
