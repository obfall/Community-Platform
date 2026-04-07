import { apiClient } from "./client";
import type { ContentReport, ContentReportDetail, BannedWord } from "./types";

export interface CreateReportInput {
  targetType: string;
  targetId: string;
  category: string;
  description?: string;
}

export interface UpdateReportInput {
  status?: string;
  assignedToUserId?: string;
}

export interface CreateActionInput {
  actionType: string;
  targetType: string;
  targetId: string;
  reason?: string;
  notes?: string;
}

export interface CreateBannedWordInput {
  word: string;
  matchType?: string;
  action?: string;
  replacement?: string;
  isActive?: boolean;
}

export const moderationApi = {
  getReports: (params?: { status?: string }) =>
    apiClient.get<ContentReport[]>("/moderation/reports", { params }).then((r) => r.data),

  getReport: (id: string) =>
    apiClient.get<ContentReportDetail>(`/moderation/reports/${id}`).then((r) => r.data),

  createReport: (data: CreateReportInput) =>
    apiClient.post<ContentReport>("/moderation/reports", data).then((r) => r.data),

  updateReport: (id: string, data: UpdateReportInput) =>
    apiClient.patch<ContentReport>(`/moderation/reports/${id}`, data).then((r) => r.data),

  createAction: (reportId: string, data: CreateActionInput) =>
    apiClient.post(`/moderation/reports/${reportId}/actions`, data).then((r) => r.data),

  getBannedWords: () => apiClient.get<BannedWord[]>("/moderation/banned-words").then((r) => r.data),

  createBannedWord: (data: CreateBannedWordInput) =>
    apiClient.post<BannedWord>("/moderation/banned-words", data).then((r) => r.data),

  deleteBannedWord: (id: string) => apiClient.delete(`/moderation/banned-words/${id}`),
};
