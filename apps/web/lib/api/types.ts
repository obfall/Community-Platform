export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface FeatureSetting {
  featureKey: string;
  featureName: string;
  category: "common" | "optional";
  isEnabled: boolean;
  description: string | null;
  sortOrder: number;
}

// --- App Settings ---

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  valueType: "string" | "integer" | "boolean" | "json";
  description: string | null;
}

export interface UpdateAppSettingInput {
  value: string;
}

export interface ToggleFeatureInput {
  isEnabled: boolean;
}

// --- Permissions ---

export interface PermissionSetting {
  id: string;
  featureKey: string;
  action: string;
  allowedRoles: string[];
  requiredRankId: string | null;
  featureSetting: {
    featureName: string;
    category: "common" | "optional";
  };
  requiredRank: {
    name: string;
    slug: string;
  } | null;
}

export interface CreatePermissionInput {
  featureKey: string;
  action: string;
  allowedRoles: string[];
  requiredRankId?: string;
}

export interface UpdatePermissionInput {
  allowedRoles?: string[];
  requiredRankId?: string | null;
}
