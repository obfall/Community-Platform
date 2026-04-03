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
