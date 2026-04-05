import { apiClient } from "./client";
import type {
  MemberAttribute,
  CreateMemberAttributeInput,
  UpdateMemberAttributeInput,
} from "./types";

export const memberAttributesApi = {
  getAll: () => apiClient.get<MemberAttribute[]>("/member-attributes").then((r) => r.data),

  create: (data: CreateMemberAttributeInput) =>
    apiClient.post<MemberAttribute>("/member-attributes", data).then((r) => r.data),

  update: (id: string, data: UpdateMemberAttributeInput) =>
    apiClient.patch<MemberAttribute>(`/member-attributes/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/member-attributes/${id}`),

  reorder: (items: { id: string; sortOrder: number }[]) =>
    apiClient.patch("/member-attributes/reorder", { items }).then((r) => r.data),
};
