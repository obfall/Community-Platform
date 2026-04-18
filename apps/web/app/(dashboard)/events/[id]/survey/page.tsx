"use client";

import { use } from "react";
import { SurveyListView } from "@/components/surveys/survey-list-view";

export default function EventSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);

  return (
    <SurveyListView
      eventId={eventId}
      basePath={`/events/${eventId}/survey`}
      createHref={`/events/${eventId}/survey/new`}
      title="アンケート"
      headingLevel="h2"
      emptySubText="イベント参加者へのアンケートを作成できます"
    />
  );
}
