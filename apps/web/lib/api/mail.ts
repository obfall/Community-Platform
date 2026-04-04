import { apiClient } from "./client";
import type {
  PaginatedResponse,
  MailMessage,
  MailMessageDetail,
  MailTemplate,
  MailSuppression,
  CreateMailMessageInput,
  UpdateMailMessageInput,
  CreateMailTemplateInput,
  UpdateMailTemplateInput,
  CreateMailSuppressionInput,
  MailMessageQuery,
} from "./types";

export const mailApi = {
  // Messages
  getMessages: (params?: MailMessageQuery) =>
    apiClient.get<PaginatedResponse<MailMessage>>("/mail/messages", { params }).then((r) => r.data),

  getMessage: (id: string) =>
    apiClient.get<MailMessageDetail>(`/mail/messages/${id}`).then((r) => r.data),

  createMessage: (data: CreateMailMessageInput) =>
    apiClient.post<MailMessage>("/mail/messages", data).then((r) => r.data),

  updateMessage: (id: string, data: UpdateMailMessageInput) =>
    apiClient.patch<MailMessage>(`/mail/messages/${id}`, data).then((r) => r.data),

  sendMessage: (id: string) =>
    apiClient.post<MailMessage>(`/mail/messages/${id}/send`).then((r) => r.data),

  // Templates
  getTemplates: () => apiClient.get<MailTemplate[]>("/mail/templates").then((r) => r.data),

  createTemplate: (data: CreateMailTemplateInput) =>
    apiClient.post<MailTemplate>("/mail/templates", data).then((r) => r.data),

  updateTemplate: (id: string, data: UpdateMailTemplateInput) =>
    apiClient.patch<MailTemplate>(`/mail/templates/${id}`, data).then((r) => r.data),

  deleteTemplate: (id: string) => apiClient.delete(`/mail/templates/${id}`),

  // Suppressions
  getSuppressions: () => apiClient.get<MailSuppression[]>("/mail/suppressions").then((r) => r.data),

  createSuppression: (data: CreateMailSuppressionInput) =>
    apiClient.post<MailSuppression>("/mail/suppressions", data).then((r) => r.data),

  deleteSuppression: (id: string) => apiClient.delete(`/mail/suppressions/${id}`),
};
