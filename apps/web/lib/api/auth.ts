import { apiClient } from "./client";
import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./types";

export const authApi = {
  login: (data: LoginInput) =>
    apiClient.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  register: (data: RegisterInput) =>
    apiClient.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>("/auth/refresh", { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) => apiClient.post("/auth/logout", { refreshToken }),

  forgotPassword: (email: string) => apiClient.post("/auth/forgot-password", { email }),

  resetPassword: (data: ResetPasswordInput) => apiClient.post("/auth/reset-password", data),

  getMe: () => apiClient.get<AuthUser>("/auth/me").then((r) => r.data),
};
