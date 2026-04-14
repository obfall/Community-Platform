import { apiClient } from "./client";
import type { VenueListItem, VenueDetail, Reservation } from "./types";

export const venuesApi = {
  getAll: (params?: { publishStatus?: string }) =>
    apiClient.get<VenueListItem[]>("/venues", { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<VenueDetail>(`/venues/${id}`).then((r) => r.data),

  create: (data: {
    name: string;
    address?: string;
    description?: string;
    accessInfo?: string;
    venueTypes?: string[];
    capacity?: number;
    publishStatus?: string;
    imageFileIds?: string[];
  }) => apiClient.post("/venues", data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/venues/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/venues/${id}`),

  createSpace: (
    venueId: string,
    data: { name: string; description?: string; capacity?: number; spaceType?: string },
  ) => apiClient.post(`/venues/${venueId}/spaces`, data).then((r) => r.data),

  getReservations: (spaceId: string) =>
    apiClient.get<Reservation[]>(`/venues/spaces/${spaceId}/reservations`).then((r) => r.data),

  createReservation: (
    spaceId: string,
    data: { title?: string; startAt: string; endAt: string; note?: string },
  ) => apiClient.post(`/venues/spaces/${spaceId}/reservations`, data).then((r) => r.data),

  cancelReservation: (reservationId: string) =>
    apiClient.patch(`/venues/reservations/${reservationId}/cancel`).then((r) => r.data),
};
