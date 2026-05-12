"use client";

import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { authApi } from "@/lib/api/auth";
import { setTokens, clearTokens, getAccessToken } from "@/lib/auth";
import type { AuthUser, LoginInput, RegisterInput } from "@/lib/api/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** owner / admin ロールのいずれか */
  isAdmin: boolean;
  /** 投稿者本人または管理者か（authorId が null/undefined のときは false） */
  canEditAuthor: (authorId: string | null | undefined) => boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.getMe(),
    enabled: typeof window !== "undefined" && !!getAccessToken(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Sentry にユーザー id を紐付け（PII 回避のため id のみ）
  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({ id: user.id });
    } else {
      Sentry.setUser(null);
    }
  }, [user?.id]);

  const login = useCallback(
    async (data: LoginInput) => {
      const res = await authApi.login(data);
      setTokens(res.accessToken, res.refreshToken);
      queryClient.setQueryData(["auth", "me"], res.user);
    },
    [queryClient],
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      const res = await authApi.register(data);
      setTokens(res.accessToken, res.refreshToken);
      queryClient.setQueryData(["auth", "me"], res.user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      const { getRefreshToken } = await import("@/lib/auth");
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // ログアウトAPI失敗してもローカルトークンはクリア
    }
    clearTokens();
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.clear();
  }, [queryClient]);

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const canEditAuthor = useCallback(
    (authorId: string | null | undefined) => {
      if (!user || !authorId) return false;
      return user.id === authorId || user.role === "owner" || user.role === "admin";
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        canEditAuthor,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
