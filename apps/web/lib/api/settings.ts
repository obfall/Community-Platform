import { apiClient } from "./client";
import type { FeatureSetting } from "./types";

export const settingsApi = {
  getFeatures: () => apiClient.get<FeatureSetting[]>("/settings/features").then((r) => r.data),
};
