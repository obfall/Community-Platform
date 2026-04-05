import { apiClient } from "./client";
import type {
  PaginatedResponse,
  EventListItem,
  EventDetail,
  EventTicket,
  EventParticipant,
  CalendarEvent,
  EventQuery,
  CreateEventInput,
  UpdateEventInput,
  CreateTicketInput,
  ParticipateEventInput,
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

  updateParticipantStatus: (participantId: string, status: string) =>
    apiClient.patch(`/events/participants/${participantId}/status`, { status }).then((r) => r.data),
};
