import { apiClient } from "./client";
import type {
  PaginatedResponse,
  SurveyListItem,
  SurveyDetail,
  SurveyResults,
  SurveyQuery,
  SurveyPendingItem,
  SurveyRecipientsResponse,
} from "./types";

export const surveysApi = {
  getAll: (params?: SurveyQuery) =>
    apiClient.get<PaginatedResponse<SurveyListItem>>("/surveys", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<SurveyDetail>(`/surveys/${id}`).then((r) => r.data),

  getPending: () => apiClient.get<SurveyPendingItem[]>("/surveys/pending").then((r) => r.data),

  create: (data: {
    title: string;
    description?: string;
    eventId?: string;
    isAnonymous?: boolean;
    startsAt?: string;
    endsAt?: string;
    questions: Array<{
      questionType: string;
      questionText: string;
      isRequired?: boolean;
      sortOrder?: number;
      options?: Array<{ value: string; label: string }>;
      minValue?: number;
      maxValue?: number;
    }>;
  }) => apiClient.post<SurveyDetail>("/surveys", data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch<SurveyDetail>(`/surveys/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/surveys/${id}/status`, { status }).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/surveys/${id}`),

  submitResponse: (
    surveyId: string,
    answers: Array<{
      questionId: string;
      selectedOptions?: string[];
      textValue?: string;
      numericValue?: number;
    }>,
  ) => apiClient.post(`/surveys/${surveyId}/responses`, { answers }).then((r) => r.data),

  getResults: (id: string) =>
    apiClient.get<SurveyResults>(`/surveys/${id}/results`).then((r) => r.data),

  getRecipients: (id: string) =>
    apiClient.get<SurveyRecipientsResponse>(`/surveys/${id}/recipients`).then((r) => r.data),

  sendReminder: (id: string) =>
    apiClient.post<{ sentCount: number }>(`/surveys/${id}/remind`).then((r) => r.data),

  sendReminderToUser: (id: string, userId: string) =>
    apiClient.post<{ sent: boolean }>(`/surveys/${id}/remind/${userId}`).then((r) => r.data),
};
