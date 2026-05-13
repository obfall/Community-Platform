import { apiClient } from "./client";
import type {
  PaginatedResponse,
  EventListItem,
  EventDetail,
  EventTicket,
  EventParticipant,
  EventParticipantDetail,
  CalendarEvent,
  EventQuery,
  CreateEventInput,
  UpdateEventInput,
  CreateTicketInput,
  ParticipateEventInput,
  ApplicationFormFull,
  ApplicationFormPublic,
  ApplicationFormConfig,
  ApplicationQuestion,
  UpsertApplicationFormConfigInput,
  CreateApplicationQuestionInput,
  UpdateApplicationQuestionInput,
  ParticipantStats,
  UpcomingEvent,
  MyUpcomingEvent,
} from "./types";

export const eventsApi = {
  // Events
  getEvents: (params?: EventQuery) =>
    apiClient.get<PaginatedResponse<EventListItem>>("/events", { params }).then((r) => r.data),

  getEvent: (id: string) => apiClient.get<EventDetail>(`/events/${id}`).then((r) => r.data),

  createEvent: (data: CreateEventInput) =>
    apiClient.post<EventDetail>("/events", data).then((r) => r.data),

  updateEvent: (id: string, data: UpdateEventInput) =>
    apiClient.patch<EventDetail>(`/events/${id}`, data).then((r) => r.data),

  deleteEvent: (id: string) => apiClient.delete(`/events/${id}`),

  // Calendar
  getCalendarEvents: (from: string, to: string) =>
    apiClient
      .get<CalendarEvent[]>("/events/calendar", { params: { from, to } })
      .then((r) => r.data),

  // Upcoming (home widget)
  getUpcomingEvents: (limit?: number) =>
    apiClient
      .get<UpcomingEvent[]>("/events/upcoming", { params: limit ? { limit } : undefined })
      .then((r) => r.data),

  // My upcoming participating events (home widget)
  getMyUpcomingEvents: (days?: number) =>
    apiClient
      .get<MyUpcomingEvent[]>("/events/my-upcoming", { params: days ? { days } : undefined })
      .then((r) => r.data),

  // Tickets
  createTicket: (eventId: string, data: CreateTicketInput) =>
    apiClient.post<EventTicket>(`/events/${eventId}/tickets`, data).then((r) => r.data),

  updateTicket: (ticketId: string, data: Partial<CreateTicketInput>) =>
    apiClient.patch<EventTicket>(`/events/tickets/${ticketId}`, data).then((r) => r.data),

  deleteTicket: (ticketId: string) => apiClient.delete(`/events/tickets/${ticketId}`),

  // Participants
  participate: (eventId: string, data?: ParticipateEventInput) =>
    apiClient.post(`/events/${eventId}/participate`, data ?? {}).then((r) => r.data),

  cancelParticipation: (eventId: string) => apiClient.delete(`/events/${eventId}/participate`),

  getParticipants: (eventId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<EventParticipant>>(`/events/${eventId}/participants`, { params })
      .then((r) => r.data),

  getParticipantDetail: (eventId: string, participantId: string) =>
    apiClient
      .get<EventParticipantDetail>(`/events/${eventId}/participants/${participantId}`)
      .then((r) => r.data),

  updateParticipantStatus: (participantId: string, status: string) =>
    apiClient.patch(`/events/participants/${participantId}/status`, { status }).then((r) => r.data),

  notifyParticipants: (eventId: string, data: { title: string; body: string }) =>
    apiClient.post(`/events/${eventId}/participants/notify`, data).then((r) => r.data),

  duplicateEvent: (eventId: string) =>
    apiClient.post<EventDetail>(`/events/${eventId}/duplicate`).then((r) => r.data),

  // Application Form
  getApplicationForm: (eventId: string) =>
    apiClient.get<ApplicationFormFull>(`/events/${eventId}/application-form`).then((r) => r.data),

  getApplicationFormPublic: (eventId: string) =>
    apiClient
      .get<ApplicationFormPublic>(`/events/${eventId}/application-form/public`)
      .then((r) => r.data),

  upsertApplicationFormConfig: (eventId: string, data: UpsertApplicationFormConfigInput) =>
    apiClient
      .put<ApplicationFormConfig>(`/events/${eventId}/application-form/config`, data)
      .then((r) => r.data),

  createQuestion: (eventId: string, data: CreateApplicationQuestionInput) =>
    apiClient
      .post<ApplicationQuestion>(`/events/${eventId}/application-form/questions`, data)
      .then((r) => r.data),

  updateQuestion: (eventId: string, questionId: string, data: UpdateApplicationQuestionInput) =>
    apiClient
      .patch<ApplicationQuestion>(
        `/events/${eventId}/application-form/questions/${questionId}`,
        data,
      )
      .then((r) => r.data),

  deleteQuestion: (eventId: string, questionId: string) =>
    apiClient.delete(`/events/${eventId}/application-form/questions/${questionId}`),

  reorderQuestions: (eventId: string, items: Array<{ id: string; sortOrder: number }>) =>
    apiClient
      .patch<ApplicationQuestion[]>(`/events/${eventId}/application-form/questions/reorder`, {
        items,
      })
      .then((r) => r.data),

  // Stats
  getParticipantStats: (eventId: string) =>
    apiClient.get<ParticipantStats>(`/events/${eventId}/participants/stats`).then((r) => r.data),
};
