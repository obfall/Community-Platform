import { apiClient } from "./client";
import type {
  AppSetting,
  UpdateAppSettingInput,
  FeatureSetting,
  ToggleFeatureInput,
  PermissionSetting,
  CreatePermissionInput,
  UpdatePermissionInput,
} from "./types";

export const settingsApi = {
  // --- App Settings ---
  getAppSettings: () => apiClient.get<AppSetting[]>("/settings/app").then((r) => r.data),

  updateAppSetting: (key: string, data: UpdateAppSettingInput) =>
    apiClient.patch<AppSetting>(`/settings/app/${key}`, data).then((r) => r.data),

  // --- Features ---
  getFeatures: () => apiClient.get<FeatureSetting[]>("/settings/features").then((r) => r.data),

  toggleFeature: (featureKey: string, data: ToggleFeatureInput) =>
    apiClient.patch<FeatureSetting>(`/settings/features/${featureKey}`, data).then((r) => r.data),

  // --- Permissions ---
  getPermissions: (featureKey?: string) =>
    apiClient
      .get<PermissionSetting[]>("/settings/permissions", {
        params: featureKey ? { featureKey } : undefined,
      })
      .then((r) => r.data),

  createPermission: (data: CreatePermissionInput) =>
    apiClient.post<PermissionSetting>("/settings/permissions", data).then((r) => r.data),

  updatePermission: (id: string, data: UpdatePermissionInput) =>
    apiClient.patch<PermissionSetting>(`/settings/permissions/${id}`, data).then((r) => r.data),

  deletePermission: (id: string) => apiClient.delete(`/settings/permissions/${id}`),
};
