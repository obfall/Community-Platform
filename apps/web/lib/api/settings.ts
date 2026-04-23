import { apiClient } from "./client";
import type {
  AppSetting,
  UpdateAppSettingInput,
  FeatureSetting,
  ToggleFeatureInput,
  OptionFeature,
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

  // --- Options (optional feature availability) ---
  getOptions: () => apiClient.get<OptionFeature[]>("/settings/options").then((r) => r.data),

  toggleOption: (featureKey: string, isAvailable: boolean) =>
    apiClient
      .patch<OptionFeature>(`/settings/options/${featureKey}`, { isAvailable })
      .then((r) => r.data),
};
