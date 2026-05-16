"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSurvey, useUpdateSurvey } from "@/hooks/surveys/use-surveys";
import { SurveyFormBuilder } from "@/components/surveys/survey-form-builder";
import type { SurveyFormData } from "@/components/surveys/survey-form-builder";

export default function SurveyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: survey, isLoading } = useSurvey(id);

  if (isLoading)
    return <div className="py-12 text-center text-muted-foreground">読み込み中...</div>;
  if (!survey)
    return (
      <div className="py-12 text-center text-muted-foreground">アンケートが見つかりません</div>
    );

  return <SurveyEditForm survey={survey} id={id} />;
}

function SurveyEditForm({
  survey,
  id,
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
  id: string;
}) {
  const router = useRouter();
  const updateSurvey = useUpdateSurvey();

  const handleSubmit = (data: SurveyFormData) => {
    updateSurvey.mutate(
      {
        id,
        data: {
          title: data.title,
          description: data.description ?? null,
          questions: data.questions,
        },
      },
      { onSuccess: () => router.push(`/surveys/${id}`) },
    );
  };

  return (
    <SurveyFormBuilder
      initialData={survey}
      onSubmit={handleSubmit}
      isSubmitting={updateSurvey.isPending}
      submitLabel="保存"
      backHref={`/surveys/${id}`}
      pageTitle="アンケート編集"
    />
  );
}
