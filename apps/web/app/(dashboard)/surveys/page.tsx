"use client";

import { SurveyListView } from "@/components/surveys/survey-list-view";

export default function SurveysPage() {
  return <SurveyListView basePath="/surveys" createHref="/surveys/new" title="アンケート" />;
}
