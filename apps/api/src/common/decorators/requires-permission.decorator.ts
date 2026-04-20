import { SetMetadata } from "@nestjs/common";

export const REQUIRES_PERMISSION_KEY = "requires_permission";

export interface RequiresPermissionMeta {
  featureKey: string;
  action: string;
}

export const RequiresPermission = (featureKey: string, action: string) =>
  SetMetadata(REQUIRES_PERMISSION_KEY, { featureKey, action });
