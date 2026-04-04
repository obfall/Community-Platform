import { SetMetadata } from "@nestjs/common";

export const FEATURE_KEY = "featureKey";
export const FeatureEnabled = (featureKey: string) => SetMetadata(FEATURE_KEY, featureKey);
